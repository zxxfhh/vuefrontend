import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default [
  // ========== 系统基础路由 ==========
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index.vue"),
    meta: {
      title: $t("menus.pureLogin"),
      showLink: false,
      rank: 101
    }
  },
  {
    path: "/redirect",
    component: Layout,
    meta: {
      title: $t("status.pureLoad"),
      showLink: false,
      rank: 102
    },
    children: [
      {
        path: "/redirect/:path(.*)",
        name: "Redirect",
        component: () => import("@/layout/redirect.vue")
      }
    ]
  },
  {
    path: "/empty",
    name: "Empty",
    component: () => import("@/views/empty/index.vue"),
    meta: {
      title: $t("menus.pureEmpty"),
      showLink: false,
      rank: 103
    }
  },

  // ========== SCADA 组态系统隐藏路由（不显示在菜单中）==========

  {
    path: "/scada",
    name: "Scada",
    component: () => import("@/views/scada/index.vue"),
    meta: {
      title: "组态编辑器",
      showLink: false,
      rank: 123
    }
  }
] satisfies Array<RouteConfigsTable>;
