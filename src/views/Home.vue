<template>
  <el-alert
      v-if="showLogoutAlert"
      :title="`账户已在其他地方登录，请重新登录。 ${countdown} 秒后自动跳转...`"
      type="error"
      center
      show-icon
      :closable="false"
  >
  </el-alert>
  <div class="home">
    <div
        v-if="showLogoutAlert"
        class="overlay"
    ></div>
    <header class="header">
      <div class="header-left">
        <div class="user-info">
          <el-icon class="icon-user">
            <User/>
          </el-icon>
          <h1 class="username">{{ userForm.username }}</h1>
        </div>
      </div>
      <div class="header-right">
        <div class="icon-Operation">
          <el-icon class="" @click="toggleSidebar">
            <Operation/>
          </el-icon>
        </div>
        <div class="login-details">
          <p>上次登录时间: {{ userForm.lastLoginTime }}</p>
        </div>
        <div class="login-details">
          <p>上次登录IP: {{ userForm.lastLoginIp }}</p>
        </div>
        <el-button plain type="danger" @click="logout">退出</el-button>
      </div>
    </header>
    <div class="content">
      <aside :class="['sidebar', { 'sidebar-collapsed': isSidebarCollapsed }]">
        <router-link class="nav-link" to="/home/welcome">
          <div class="nav-item">
            <el-icon><HomeFilled /></el-icon>
            <span v-if="!isSidebarCollapsed">首页</span>
          </div>
        </router-link>
        <router-link class="nav-link" to="/home/user">
          <div class="nav-item">
            <el-icon><UserFilled /></el-icon>
            <span v-if="!isSidebarCollapsed">用户信息</span>
          </div>
        </router-link>
        <router-link class="nav-link" to="/home/LoginStatistics">
          <div class="nav-item">
            <el-icon><TrendCharts /></el-icon>
            <span v-if="!isSidebarCollapsed">登录统计</span>
          </div>
        </router-link>
        <router-link class="nav-link" to="/home/fileUpload">
          <div class="nav-item">
            <el-icon><Briefcase /></el-icon>
            <span v-if="!isSidebarCollapsed">文件上传</span>
          </div>
        </router-link>
      </aside>
        <main class="main">
          <router-view/>
        </main>
    </div>
  </div>
</template>

<script>
import {ref, reactive, onMounted, onBeforeUnmount} from 'vue';
import {useRouter} from 'vue-router';
import request from "@/api/request";
import {Briefcase, HomeFilled, Operation, TrendCharts, User, UserFilled} from "@element-plus/icons";
import {ElMessage} from 'element-plus';

export default {
  name: 'Home',
  components: {UserFilled, TrendCharts, Briefcase, HomeFilled, User, Operation},
  setup() {
    const router = useRouter();

    /**
     * 用户信息
     * @type {UnwrapNestedRefs<{lastLoginTime: string, username: string, lastLoginIp: string}>}
     */
    const userForm = reactive({
      username: sessionStorage.getItem('username'),
      lastLoginTime: sessionStorage.getItem('lastLoginTime'),
      lastLoginIp: sessionStorage.getItem('lastLoginIp')
    });

    const intervalId = ref(null);
    const isSidebarCollapsed = ref(false);
    const showLogoutAlert = ref(false);
    const countdown = ref(5);

    /**
     * 退出事件
     */
    const logout = () => {
      request.post('/auth/logout').then(response => {
        if(response.code === 200){
          ElMessage.success("退出成功");
          sessionStorage.clear();
          request.defaults.headers.common['Authorization'] = 'Bearer '
          request.defaults.headers.common['Roles'] = ``;
          router.push('/');
        }else{
          ElMessage.error("退出失败")
        }
      }).catch(error => {
        ElMessage.error("退出失败")
      });
    };

    /**
     * 状态检测事件
     */
    const checkLogoutStatus = () => {
      request.post('/auth/checkLoginStatus').then(response => {
        if (response.code === 501) {
          clearInterval(intervalId.value);
          showLogoutAlert.value = true;
          //倒计时5秒
          intervalId.value = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 0) {
              clearInterval(intervalId.value);
              router.push('/');
            }
          }, 1000);
        }
      }).catch(error => {
        clearInterval(intervalId.value);
        router.push('/');
      });
    };

    // 是否收起menu
    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
    };

    //钩子函数  创建定时器
    onMounted(() => {
      intervalId.value = setInterval(() => {
        checkLogoutStatus();
      }, 3000);
    });

    //在组件销毁前执行清除定时器
    onBeforeUnmount(() => {
      clearInterval(intervalId.value);
    });

    return {
      userForm,
      isSidebarCollapsed,
      toggleSidebar,
      logout,
      showLogoutAlert,
      countdown
    };
  }
};
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');


.home {
  display: flex;
  flex-direction: column;
  height: 98vh;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  background-color: #2f3640;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: 'Roboto', sans-serif;
  height: 50px;
}

.header-left {
  display: flex;
  align-items: center;
  background-color: #2f3640;
  color: #fff;
  padding-left: 20px;
  width: 180px;
}

.header-right {
  flex-grow: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  background-color: #DCDCDC;
  padding-right: 20px;
  height: 50px;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}


.icon-user {
  display: flex;
  font-size: 20px;
  padding-left: 60px;
}

.username {
  font-size: 14px;
  font-weight: 500;
  margin: 0 auto;
  padding-left: 60px;
}

.login-details {
  display: flex;
  flex-direction: column;
  padding-right: 20px;
}

.login-details p {
  margin: 0;
  font-family: 'Roboto', sans-serif;
  font-weight: 400;
  font-size: 15px;
}

.content {
  display: flex;
  flex: 1;
}

.sidebar {
  width: 200px;
  background-color: #2f3640;
  color: #fff;
  padding: 20px 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  transition: width 0.3s;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sidebar-collapsed {
  width: 60px;
}


.nav-link {
  text-decoration: none;
  color: #fff;
  margin-bottom: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background 0.3s, color 0.3s;
}

.nav-link:hover .nav-item {
  background-color: #414b57;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.nav-item i {
  margin-right: 10px;
}

.icon-Operation {
  display: flex;
  padding-right: 975px;
}
.main {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f8f8f8;
}

/* 样式 */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999; /* 确保遮罩层位于所有其他内容之上 */
}

</style>
