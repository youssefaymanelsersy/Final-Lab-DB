export default function AdminLayout({ user, onLogout }) {
  return (
    <div className="layout-container">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}