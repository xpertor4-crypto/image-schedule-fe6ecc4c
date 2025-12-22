// (excerpt) change emailRedirectTo to /verify inside the signUp call:
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/verify`,
    data: { full_name: fullName },
  },
});