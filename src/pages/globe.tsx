import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { Airport, latLonToVector3, generateGreatCirclePoints } from '@/lib/flightCalculations';
import earthTexture from '@/assets/earth-map.jpg';
import airportsData from '@/data/airports.json';

interface GlobeProps {
  fromAirport: Airport | null;
  toAirport: Airport | null;
  onAnimationComplete?: () => void;
  isAnimating: boolean;
  setIsAnimating: (value: boolean) => void;
}

const GLOBE_RADIUS = 5;
const SEGMENTS = 64;

export default function Globe({ 
  fromAirport, 
  toAirport, 
  onAnimationComplete,
  isAnimating,
  setIsAnimating 
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const flightPathRef = useRef<THREE.Line | null>(null);
  const planeRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const allMarkersGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);
  const targetRotation = useRef({ x: 0, y: 0 });
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const markerToAirportMap = useRef<Map<THREE.Object3D, Airport>>(new Map());
  
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 18;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x0ea5e9, 0.3);
    backLight.position.set(-5, -3, -5);
    scene.add(backLight);

    // Create globe with Earth texture - white land, light blue water
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, SEGMENTS, SEGMENTS);
    
    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load(earthTexture);
    earthMap.colorSpace = THREE.SRGBColorSpace;
    
    // Shader to convert Earth texture to white land and light blue water
    const globeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        earthTexture: { value: earthMap },
        landColor: { value: new THREE.Color(0xffffff) },
        waterColor: { value: new THREE.Color(0x7dd3fc) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D earthTexture;
        uniform vec3 landColor;
        uniform vec3 waterColor;
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vec4 tex = texture2D(earthTexture, vUv);
          
          // Blue marble texture: oceans are deep blue, land is green/brown/white
          // Detect ocean by high blue and low red/green ratio
          float isOcean = step(tex.r + tex.g, tex.b * 1.8);
          
          // Also catch lighter blue areas
          float blueish = step(0.3, tex.b) * step(tex.r, 0.45) * step(tex.g, 0.55);
          isOcean = max(isOcean, blueish);
          
          vec3 color = mix(landColor, waterColor, isOcean);
          
          // Lighting
          float light = dot(vNormal, normalize(vec3(1.0, 0.5, 1.0)));
          light = 0.5 + 0.5 * light;
          
          gl_FragColor = vec4(color * light, 1.0);
        }
      `,
    });

    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);
    globeRef.current = globe;

    // Add atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, SEGMENTS, SEGMENTS);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.22, 0.74, 0.97, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Markers group for selected flight route
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // All airports markers group (always visible)
    const allMarkersGroup = new THREE.Group();
    globe.add(allMarkersGroup); // Add to globe so they rotate with it
    allMarkersGroupRef.current = allMarkersGroup;

    // Create pin markers for all airports
    const BLUE_COLOR = 0x3b82f6;
    const PIN_HEIGHT = 0.4;
    const CIRCLE_RADIUS = 0.1;
    const LINE_WIDTH = 0.02;

    (airportsData as Airport[]).forEach((airport) => {
      const [x, y, z] = latLonToVector3(airport.lat, airport.lon, GLOBE_RADIUS);
      const position = new THREE.Vector3(x, y, z);
      const normal = position.clone().normalize();

      const pinGroup = new THREE.Group();
      pinGroup.userData = { airport }; // Store airport data for click detection

      // Create the vertical pin line (cylinder)
      const lineGeometry = new THREE.CylinderGeometry(LINE_WIDTH, LINE_WIDTH, PIN_HEIGHT, 8);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: BLUE_COLOR });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      
      const lineCenter = position.clone().add(normal.clone().multiplyScalar(PIN_HEIGHT / 2));
      line.position.copy(lineCenter);
      line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      pinGroup.add(line);

      // Create the circle head (make it larger for easier clicking)
      const circleGeometry = new THREE.CircleGeometry(CIRCLE_RADIUS * 1.5, 32);
      const circleMaterial = new THREE.MeshBasicMaterial({ 
        color: BLUE_COLOR, 
        side: THREE.DoubleSide 
      });
      const circle = new THREE.Mesh(circleGeometry, circleMaterial);
      
      const circlePos = position.clone().add(normal.clone().multiplyScalar(PIN_HEIGHT));
      circle.position.copy(circlePos);
      circle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      pinGroup.add(circle);

      // Add glow ring
      const glowGeometry = new THREE.RingGeometry(CIRCLE_RADIUS * 1.5, CIRCLE_RADIUS * 2.5, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: BLUE_COLOR,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(circlePos);
      glow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      pinGroup.add(glow);

      // Map all children to airport for raycasting
      pinGroup.children.forEach(child => {
        markerToAirportMap.current.set(child, airport);
      });

      allMarkersGroup.add(pinGroup);
    });

    // Stars background
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
    });

    const starsVertices = [];
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (autoRotate.current && globeRef.current) {
        globeRef.current.rotation.y += 0.001;
      }

      // Smooth rotation towards target
      if (globeRef.current) {
        globeRef.current.rotation.x += (targetRotation.current.x - globeRef.current.rotation.x) * 0.05;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse controls
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      autoRotate.current = false;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !globeRef.current) return;

      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      globeRef.current.rotation.y += deltaX * 0.005;
      targetRotation.current.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, 
        targetRotation.current.x + deltaY * 0.005));

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      setTimeout(() => {
        autoRotate.current = true;
      }, 2000);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(10, Math.min(30, camera.position.z + e.deltaY * 0.01));
    };

    // Click handler for marker detection
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || !allMarkersGroupRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      
      // Get all meshes from all pin groups
      const allMeshes: THREE.Object3D[] = [];
      allMarkersGroupRef.current.children.forEach(pinGroup => {
        pinGroup.children.forEach(mesh => {
          allMeshes.push(mesh);
        });
      });

      const intersects = raycasterRef.current.intersectObjects(allMeshes, false);
      
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const airport = markerToAirportMap.current.get(clickedMesh);
        
        if (airport) {
          setSelectedAirport(airport);
          setPopupPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      } else {
        setSelectedAirport(null);
        setPopupPosition(null);
      }
    };

    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mouseleave', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    // Touch controls
    const handleTouchStart = (e: TouchEvent) => {
      isDragging.current = true;
      autoRotate.current = false;
      previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !globeRef.current) return;

      const deltaX = e.touches[0].clientX - previousMousePosition.current.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.current.y;

      globeRef.current.rotation.y += deltaX * 0.005;
      targetRotation.current.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, 
        targetRotation.current.x + deltaY * 0.005));

      previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      setTimeout(() => {
        autoRotate.current = true;
      }, 2000);
    };

    renderer.domElement.addEventListener('touchstart', handleTouchStart);
    renderer.domElement.addEventListener('touchmove', handleTouchMove);
    renderer.domElement.addEventListener('touchend', handleTouchEnd);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mouseleave', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      renderer.domElement.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(animationFrameRef.current);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
      markerToAirportMap.current.clear();
    };
  }, []);

  // Create pin marker for airport (blue circle with vertical line)
  const createMarker = useCallback((airport: Airport) => {
    const [x, y, z] = latLonToVector3(airport.lat, airport.lon, GLOBE_RADIUS);
    const position = new THREE.Vector3(x, y, z);
    const normal = position.clone().normalize();
    
    const PIN_HEIGHT = 0.5;
    const CIRCLE_RADIUS = 0.12;
    const LINE_WIDTH = 0.025;
    const BLUE_COLOR = 0x3b82f6;

    const group = new THREE.Group();

    // Create the vertical pin line (cylinder)
    const lineGeometry = new THREE.CylinderGeometry(LINE_WIDTH, LINE_WIDTH, PIN_HEIGHT, 8);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: BLUE_COLOR });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    
    // Position line: starts at globe surface, extends outward
    const lineCenter = position.clone().add(normal.clone().multiplyScalar(PIN_HEIGHT / 2));
    line.position.copy(lineCenter);
    
    // Orient line to point outward from globe center
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    group.add(line);

    // Create the circle head (filled disc)
    const circleGeometry = new THREE.CircleGeometry(CIRCLE_RADIUS, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({ 
      color: BLUE_COLOR, 
      side: THREE.DoubleSide 
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    
    // Position circle at top of pin
    const circlePos = position.clone().add(normal.clone().multiplyScalar(PIN_HEIGHT));
    circle.position.copy(circlePos);
    
    // Orient circle to face outward (perpendicular to globe surface)
    circle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    group.add(circle);

    // Add outer glow ring for visibility
    const glowGeometry = new THREE.RingGeometry(CIRCLE_RADIUS, CIRCLE_RADIUS * 2, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: BLUE_COLOR,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(circlePos);
    glow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    group.add(glow);

    // Pulse animation on glow
    gsap.to(glow.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    console.log('Created marker for:', airport.code, 'at position:', x, y, z);
    return group;
  }, []);

  // Update flight path when airports change
  useEffect(() => {
    if (!sceneRef.current || !markersGroupRef.current) return;

    // Clear previous markers and path
    while (markersGroupRef.current.children.length > 0) {
      const child = markersGroupRef.current.children[0];
      markersGroupRef.current.remove(child);
    }

    if (flightPathRef.current) {
      sceneRef.current.remove(flightPathRef.current);
      flightPathRef.current = null;
    }

    if (planeRef.current) {
      sceneRef.current.remove(planeRef.current);
      planeRef.current = null;
    }

    if (!fromAirport || !toAirport) return;

    // Add markers
    const fromMarker = createMarker(fromAirport);
    const toMarker = createMarker(toAirport);
    markersGroupRef.current.add(fromMarker);
    markersGroupRef.current.add(toMarker);

    // Create flight path
    const points = generateGreatCirclePoints(fromAirport, toAirport, 100, GLOBE_RADIUS, 0.2);
    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p[0], p[1], p[2]))
    );

    const pathGeometry = new THREE.TubeGeometry(curve, 100, 0.02, 8, false);
    const pathMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.8,
    });
    const flightPath = new THREE.Mesh(pathGeometry, pathMaterial);
    sceneRef.current.add(flightPath);
    flightPathRef.current = flightPath as unknown as THREE.Line;

    // Create plane marker
    const planeGeometry = new THREE.ConeGeometry(0.1, 0.25, 8);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    sceneRef.current.add(plane);
    planeRef.current = plane;

    // Position plane at start
    const startPos = curve.getPointAt(0);
    plane.position.copy(startPos);

    // Animate the plane along the path
    if (isAnimating) {
      const animationDuration = 4;
      const progress = { value: 0 };

      gsap.to(progress, {
        value: 1,
        duration: animationDuration,
        ease: 'power1.inOut',
        onUpdate: () => {
          const point = curve.getPointAt(progress.value);
          const tangent = curve.getTangentAt(progress.value);
          
          plane.position.copy(point);
          
          // Orient plane along path
          // Orient plane along path
          const up = point.clone().normalize();
          const forward = tangent.normalize();
          const right = new THREE.Vector3().crossVectors(up, forward).normalize();
          forward.crossVectors(right, up);
          
          const matrix = new THREE.Matrix4();
          matrix.makeBasis(right, up, forward);
          plane.setRotationFromMatrix(matrix);
          plane.rotateX(Math.PI / 2);
        },
        onComplete: () => {
          setIsAnimating(false);
          onAnimationComplete?.();
        },
      });
    }

    // Focus camera on the route
    autoRotate.current = false;
    const midPoint = curve.getPointAt(0.5);
    const targetAngleY = Math.atan2(midPoint.x, midPoint.z);
    
    if (globeRef.current) {
      gsap.to(globeRef.current.rotation, {
        y: -targetAngleY,
        duration: 1.5,
        ease: 'power2.out',
        onComplete: () => {
          setTimeout(() => {
            autoRotate.current = true;
          }, 3000);
        },
      });
    }
  }, [fromAirport, toAirport, isAnimating, createMarker, onAnimationComplete, setIsAnimating]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />
      
      {/* Airport Info Popup */}
      {selectedAirport && popupPosition && (
        <div 
          className="absolute z-50 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-4 min-w-[250px] pointer-events-auto"
          style={{ 
            left: Math.min(popupPosition.x + 10, (containerRef.current?.clientWidth || 400) - 270),
            top: Math.min(popupPosition.y + 10, (containerRef.current?.clientHeight || 400) - 180),
          }}
        >
          <button 
            onClick={() => { setSelectedAirport(null); setPopupPosition(null); }}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{selectedAirport.code}</span>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Airport</span>
            </div>
            <h3 className="font-semibold text-foreground">{selectedAirport.name}</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>📍 {selectedAirport.city}, {selectedAirport.country}</p>
              <p>🌐 Lat: {selectedAirport.lat.toFixed(4)}°, Lon: {selectedAirport.lon.toFixed(4)}°</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
         
