import { Outlet } from "react-router-dom";

import AdminNavbar from "../../components/admin/AdminNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";


function Layout() {

  return (
    <>
      {/* Admin Navbar */}
      <AdminNavbar />

      <div className="flex">

        {/* Admin Sidebar */}
        <AdminSidebar />


        {/* Admin Content */}
        <div
          className="
            flex-1
            px-4
            py-10
            md:px-10
            h-[calc(100vh-64px)]
            overflow-y-auto
          "
        >
          <Outlet />
        </div>

      </div>
    </>
  );
}


export default Layout;