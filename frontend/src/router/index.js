import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/cashier'
  },
  {
    path: '/cashier',
    name: 'Cashier',
    component: () => import('@/views/Cashier.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/Admin.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/admin/Dashboard.vue') },
      { path: 'products', name: 'Products', component: () => import('@/views/admin/Products.vue') },
      { path: 'members', name: 'Members', component: () => import('@/views/admin/Members.vue') },
      { path: 'stock', name: 'Stock', component: () => import('@/views/admin/Stock.vue') },
      { path: 'orders', name: 'Orders', component: () => import('@/views/admin/Orders.vue') },
      { path: 'statistics', name: 'Statistics', component: () => import('@/views/admin/Statistics.vue') },
      { path: 'users', name: 'Users', component: () => import('@/views/admin/Users.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
  } else if (to.meta.requiresAdmin && userStore.user?.role !== 'admin') {
    next('/cashier')
  } else if (to.path === '/login' && userStore.token) {
    next(userStore.user?.role === 'admin' ? '/admin' : '/cashier')
  } else {
    next()
  }
})

export default router
