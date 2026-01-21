<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const props = defineProps<{
  user?: {
    name: string
    email: string
    avatar?: string
  }
}>()

const emailInitials = computed(() => props.user?.email.slice(0, 2) ?? '')

const route = useRoute()

const navLinks = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/products', label: 'Browse' },
]

const isActive = (path: string) => route.path.startsWith(path)

const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

watch(isMenuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMenuOpen.value) closeMenu()
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <header class="app-header">
    <RouterLink to="/dashboard" class="logo">
      <span class="logo-mark">O</span>
      <span class="logo-text">fferBy</span>
    </RouterLink>

    <!-- Desktop nav -->
    <nav class="nav desktop-only">
      <RouterLink
        v-for="link in navLinks"
        :key="link.path"
        :to="link.path"
        class="nav-link"
        :class="{ active: isActive(link.path) }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <!-- Desktop user menu -->
    <div v-if="user" class="user-menu desktop-only">
      <span class="user-name">{{ user.name }}</span>
      <AppAvatar :name="user.name" :src="user.avatar" :initials="emailInitials" />
      <button class="logout-btn" @click="handleLogout">Logout</button>
    </div>
    <div v-else class="auth-links desktop-only">
      <RouterLink to="/login" class="nav-link">Log in</RouterLink>
      <RouterLink to="/register" class="register-link">Register</RouterLink>
    </div>

    <!-- Mobile hamburger -->
    <button
      class="menu-toggle mobile-only"
      :class="{ active: isMenuOpen }"
      @click="toggleMenu"
      :aria-expanded="isMenuOpen"
      aria-label="Menu"
    >
      <span class="menu-line"></span>
      <span class="menu-line"></span>
    </button>

    <!-- Full-screen mobile menu (teleported to body to escape backdrop-filter containing block) -->
    <Teleport to="body">
      <Transition name="curtain">
        <div v-if="isMenuOpen" class="mobile-menu" role="dialog" aria-modal="true">
        <!-- Decorative watermark -->
        <span class="menu-watermark">O</span>

        <!-- Vertical accent text -->
        <span class="menu-accent-text">Menu</span>

        <!-- Close button -->
        <button class="menu-close" @click="closeMenu" aria-label="Close menu">
          <span class="close-line"></span>
          <span class="close-line"></span>
        </button>

        <!-- Navigation links with staggered animation -->
        <nav class="menu-nav">
          <RouterLink
            v-for="(link, index) in navLinks"
            :key="link.path"
            :to="link.path"
            class="menu-link"
            :class="{ active: isActive(link.path) }"
            :style="{ animationDelay: `${0.1 + index * 0.08}s` }"
            @click="closeMenu"
          >
            <span class="menu-link-number">0{{ index + 1 }}</span>
            <span class="menu-link-text">{{ link.label }}</span>
          </RouterLink>
        </nav>

        <!-- User section or auth -->
        <div class="menu-footer">
          <template v-if="user">
            <div class="menu-user">
              <AppAvatar :name="user.name" :src="user.avatar" :initials="emailInitials" size="lg" />
              <div class="menu-user-info">
                <span class="menu-user-name">{{ user.name }}</span>
                <span class="menu-user-email">{{ user.email }}</span>
              </div>
            </div>
            <button class="menu-logout" @click="handleLogout">Sign out</button>
          </template>
          <template v-else>
            <RouterLink to="/login" class="menu-auth-link" @click="closeMenu">Log in</RouterLink>
            <RouterLink to="/register" class="menu-register" @click="closeMenu">Create Account</RouterLink>
          </template>
        </div>
      </div>
      </Transition>
    </Teleport>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-xl);
  background: rgba(247, 244, 239, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(26, 47, 35, 0.06);
}

.logo {
  display: flex;
  align-items: baseline;
  gap: 2px;
  text-decoration: none;
}

.logo-mark {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  color: var(--forest);
  line-height: 1;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--forest);
  letter-spacing: -0.02em;
}

.nav {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--space-xl);
}

.nav-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--charcoal-soft);
  text-decoration: none;
  padding: var(--space-sm) 0;
  position: relative;
  transition: color 0.2s var(--ease-out);
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--coral);
  transition: width 0.3s var(--ease-out);
}

.nav-link:hover,
.nav-link.active {
  color: var(--charcoal);
}

.nav-link.active::after,
.nav-link:hover::after {
  width: 100%;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--charcoal);
}

.logout-btn {
  padding: var(--space-sm) var(--space-md);
  background: transparent;
  border: 1px solid var(--charcoal-soft);
  color: var(--charcoal-soft);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
}

.logout-btn:hover {
  border-color: var(--charcoal);
  color: var(--charcoal);
}

.auth-links {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.register-link {
  padding: var(--space-sm) var(--space-md);
  background: var(--coral);
  color: white;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 100px;
  transition: all 0.3s var(--ease-out);
}

.register-link:hover {
  background: var(--forest);
}

/* ===== MOBILE VISIBILITY ===== */
.mobile-only { display: none; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex; }
}

/* ===== HAMBURGER (Two Lines) ===== */
.menu-toggle {
  width: 44px;
  height: 44px;
  background: transparent;
  border: none;
  cursor: pointer;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  z-index: 201;
}

.menu-line {
  height: 1.5px;
  background: var(--forest);
  border-radius: 1px;
  transition: all 0.4s var(--ease-out);
}

.menu-line:first-child { width: 24px; }
.menu-line:last-child { width: 16px; }

.menu-toggle:hover .menu-line:last-child { width: 24px; }

/* Morph to X */
.menu-toggle.active .menu-line {
  width: 24px;
}
.menu-toggle.active .menu-line:first-child {
  transform: translateY(3.75px) rotate(45deg);
}
.menu-toggle.active .menu-line:last-child {
  transform: translateY(-3.75px) rotate(-45deg);
}

</style>

<!-- Non-scoped styles for teleported mobile menu -->
<style>
/* ===== FULL-SCREEN MENU ===== */
.mobile-menu {
  position: fixed;
  inset: 0;
  background: var(--cream);
  z-index: 200;
  display: flex;
  flex-direction: column;
  padding: var(--space-xl);
  padding-top: 100px;
  overflow-y: auto;
}

/* Decorative watermark O */
.menu-watermark {
  position: absolute;
  top: -5%;
  right: -10%;
  font-family: var(--font-display);
  font-size: clamp(300px, 50vw, 500px);
  font-weight: 600;
  color: var(--sage-light);
  opacity: 0.15;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

/* Vertical accent text */
.menu-accent-text {
  position: absolute;
  left: var(--space-lg);
  top: 50%;
  transform: translateY(-50%) rotate(-90deg);
  font-family: var(--font-body);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sage);
  transform-origin: center;
}

/* Close button */
.menu-close {
  position: absolute;
  top: var(--space-md);
  right: var(--space-xl);
  width: 44px;
  height: 44px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-line {
  position: absolute;
  width: 24px;
  height: 1.5px;
  background: var(--forest);
  border-radius: 1px;
  transition: background 0.2s;
}
.close-line:first-child { transform: rotate(45deg); }
.close-line:last-child { transform: rotate(-45deg); }
.menu-close:hover .close-line { background: var(--coral); }

/* ===== NAVIGATION LINKS ===== */
.menu-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: auto;
}

.menu-link {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  text-decoration: none;
  opacity: 0;
  transform: translateY(20px);
  animation: menuLinkIn 0.5s var(--ease-out) forwards;
}

@keyframes menuLinkIn {
  to { opacity: 1; transform: translateY(0); }
}

.menu-link-number {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--sage);
  min-width: 24px;
}

.menu-link-text {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 8vw, 3.5rem);
  font-weight: 400;
  color: var(--charcoal-soft);
  line-height: 1.1;
  transition: color 0.3s var(--ease-out);
}

.menu-link:hover .menu-link-text,
.menu-link.active .menu-link-text {
  color: var(--charcoal);
}

.menu-link.active .menu-link-number {
  color: var(--coral);
}

/* ===== FOOTER SECTION ===== */
.menu-footer {
  margin-top: auto;
  padding-top: var(--space-xl);
  border-top: 1px solid var(--sage-light);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  opacity: 0;
  animation: menuLinkIn 0.5s var(--ease-out) 0.3s forwards;
}

.menu-user {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.menu-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-user-name {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--charcoal);
}

.menu-user-email {
  font-size: 0.8125rem;
  color: var(--charcoal-soft);
}

.menu-logout,
.menu-auth-link {
  padding: var(--space-md) var(--space-lg);
  background: transparent;
  border: 1.5px solid var(--charcoal-soft);
  color: var(--charcoal-soft);
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  text-align: center;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
}

.menu-logout:hover,
.menu-auth-link:hover {
  border-color: var(--forest);
  color: var(--forest);
}

.menu-register {
  display: block;
  padding: var(--space-md) var(--space-lg);
  background: var(--coral);
  color: white;
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  text-align: center;
  border-radius: 100px;
  transition: all 0.3s var(--ease-out);
}

.menu-register:hover {
  background: var(--forest);
}

/* ===== CURTAIN TRANSITION ===== */
.curtain-enter-active {
  transition: clip-path 0.5s var(--ease-out);
}
.curtain-leave-active {
  transition: clip-path 0.4s var(--ease-out);
}
.curtain-enter-from,
.curtain-leave-to {
  clip-path: circle(0% at calc(100% - 42px) 32px);
}
.curtain-enter-to,
.curtain-leave-from {
  clip-path: circle(150% at calc(100% - 42px) 32px);
}
</style>
