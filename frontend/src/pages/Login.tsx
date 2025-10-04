export default function Login() {
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <form className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Email" />
        <input className="w-full border rounded px-3 py-2" placeholder="Password" type="password" />
        <button className="w-full bg-black text-white rounded px-3 py-2">Sign In</button>
      </form>
    </div>
  )
}


