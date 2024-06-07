<template>
  <div class="image-container">
    <img src="../assets/background.jpg" alt="Vue Logo">
  </div>
</template>

<script>
import { useStore } from 'vuex';
import {ref} from "vue";


export default {
  name: 'Welcome',
  setup() {
    const store = useStore();

    return {
    };
  }
};
</script>

<style scoped>
.image-container {
  width: 100vw; /* 视窗宽度 */
  height: 100vh; /* 视窗高度 */
  overflow: hidden; /* 确保图片不会溢出容器 */
}

.image-container img {
  width: 100%; /* 图片宽度填充容器 */
  height: 100%; /* 图片高度填充容器 */
  object-fit: cover; /* 让图片铺满整个容器 */
}
</style>
