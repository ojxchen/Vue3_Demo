import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Login from '../views/Login.vue';
import store from '../store';
import Register from "../views/Register.vue";
import User from "../views/User.vue";
import LoginStatistics from "@/views/LoginStatistics.vue";
import Welcome from "@/views/Welcome.vue";
import FileUpload from "@/views/FileUpload.vue";

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true, roles: ['Admin'] },
    children: [
      {
        path: 'user',
        component: User
      },
      {
        path: 'loginStatistics',
        component: LoginStatistics
      },
      {
        path: 'welcome',
        component: Welcome,
      },
      {
        path: 'fileUpload',
        component: FileUpload,
      }
    ]
  }

];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = store.getters.isAuthenticated; // 从 Vuex store 获取用户的认证状态
  const userRoles = store.getters.roles; // 从 Vuex store 获取用户的角色

  if (to.matched.some(record => record.meta.requiresAuth)) {  // 检查目标路由是否需要身份验证
    if (!isAuthenticated) {  // 如果用户没有通过身份验证
      next({ name: 'Login' }); // 重定向到登录页面
    } else {  // 如果用户已经通过身份验证
      const requiredRoles = to.meta.roles; // 获取目标路由所需的角色
      if (requiredRoles && requiredRoles.some(role => userRoles.includes(role))) { // 检查用户是否具有所需角色
        next(); // 用户具有所需角色，继续导航
      } else {
        next({ name: 'Home' }); // 或者重定向到一个错误页面
      }
    }
  } else {
    next(); // 如果目标路由不需要身份验证，继续导航
  }
});

export default router;
