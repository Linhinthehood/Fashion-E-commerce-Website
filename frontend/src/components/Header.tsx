import { Link, NavLink } from 'react-router-dom'

const menus = [
  {
    label: 'Apparel',
    path: '/c/apparel',
    children: [
      { label: 'Topwear', path: '/c/apparel/topwear' },
      { label: 'Bottomwear', path: '/c/apparel/bottomwear' }
    ]
  },
  {
    label: 'Accessories',
    path: '/c/accessories',
    children: [
      { label: 'Hat', path: '/c/accessories/hat' },
      { label: 'Watch', path: '/c/accessories/watch' }
    ]
  },
  {
    label: 'Footwear',
    path: '/c/footwear',
    children: [
      { label: 'Shoe', path: '/c/footwear/shoe' }
    ]
  }
]

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-wide hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black rounded px-1">
          Fashion
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink
            to="/"
            className={({ isActive }) => `px-3 py-2 rounded-md transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black ${isActive ? 'text-black font-medium' : 'text-gray-700'}`}
          >
            Home
          </NavLink>
          {menus.map((m) => (
            <div key={m.label} className="relative group">
              <NavLink
                to={m.path}
                className={({ isActive }) => `flex items-center gap-1 px-3 py-2 rounded-md transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black ${isActive ? 'text-black font-medium' : 'text-gray-700'}`}
              >
                <span>{m.label}</span>
                <span className="text-gray-400 group-hover:text-gray-600">▾</span>
              </NavLink>
              <div className="absolute left-0 top-full hidden group-hover:block group-focus-within:block bg-white border rounded-lg shadow-lg mt-2 min-w-44 z-50 ring-1 ring-black/5">
                <ul className="py-2">
                  {m.children.map((c) => (
                    <li key={c.path}>
                      <Link
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                        to={c.path}
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          <NavLink
            to="/about"
            className={({ isActive }) => `px-3 py-2 rounded-md transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black ${isActive ? 'text-black font-medium' : 'text-gray-700'}`}
          >
            About
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) => `px-3 py-2 rounded-md transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black ${isActive ? 'text-black font-medium' : 'text-gray-700'}`}
          >
            Contact
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
