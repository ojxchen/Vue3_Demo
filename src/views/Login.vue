<template>
  <div class="container">
    <el-card class="card login-card">
      <div class="title">欢迎登录</div>
      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-width="0px">
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="用户名" @input="saveUsername"></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginForm.password" placeholder="密码" type="password"></el-input>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="loginForm.rememberMe">记住密码</el-checkbox>
        </el-form-item>
        <el-form-item class="btn-item">
          <el-button type="primary" @click="handleLogin">登录</el-button>
          <el-link class="link" @click="showRegister">注册</el-link>
          <el-link class="link" @click="forgetPasswordDialog = true">忘记密码</el-link>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 忘记密码对话框 -->
    <el-dialog v-model="forgetPasswordDialog" :close-on-click-modal="false" class="forgetPassword-dialog"
               title="忘记密码">
      <el-form ref="forgetPasswordFromRef" :model="forgetPasswordFrom" :rules="forgetPasswordRules" label-width="0px">
        <el-form-item prop="username">
          <el-input v-model="forgetPasswordFrom.username" placeholder="用户名"></el-input>
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="forgetPasswordFrom.email" placeholder="邮箱"></el-input>
        </el-form-item>
        <el-form-item prop="newPassword">
          <el-input v-model="forgetPasswordFrom.newPassword" placeholder="新密码" type="password"></el-input>
          <div v-if="passwordStrength > 0" class="password-strength">
            <el-button :type="passwordStrength === 1 ? 'success' : 'default'">弱</el-button>
            <el-button :type="passwordStrength === 2 ? 'warning' : 'default'">中</el-button>
            <el-button :type="passwordStrength === 3 ? 'danger' : 'default'">强</el-button>
          </div>
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model="forgetPasswordFrom.confirmPassword" placeholder="确认密码" type="password"></el-input>
        </el-form-item>
        <el-form-item prop="code" style="display: flex;">
          <el-input v-model="forgetPasswordFrom.code" placeholder="验证码" style="flex: 1;"></el-input>
          <el-button style="margin-left: 10px;" type="info" @click="sendEmailCode">发送验证码</el-button>
        </el-form-item>
        <el-form-item class="btn-item">
          <el-button type="primary" @click="handelResetPassword">重置密码</el-button>
          <el-button @click="forgetPasswordDialog = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>


  </div>
  <!--滑块验证码-->
  <div v-if="isCaptchaVisible" class="captcha-overlay">
    <Vcode :show="isCaptchaVisible" @close="handleCaptchaClose" @success="handleCaptchaSuccess"/>
  </div>
</template>

<script>
import {ref, reactive, onMounted, toRefs, computed} from 'vue';
import {useRouter} from 'vue-router';
import {useStore} from 'vuex';
import {ElMessage} from 'element-plus';
import Cookies from 'js-cookie';
import request from '@/api/request';
import Vcode from 'vue3-puzzle-vcode';


export default {
  name: 'Login',
  components: {Vcode},   //注册组件
  setup() {

    const router = useRouter();
    const store = useStore();

    /**
     * 登陆表单数据
     * @type {UnwrapNestedRefs<{password: string, rememberMe: boolean, username: string}>}
     */
    const loginForm = reactive({
      username: '',
      password: '',
      rememberMe: false
    });

    /**
     * 登录表单数据校验规则
     * @type {{password: [{trigger: string, message: string, required: boolean},{pattern: RegExp, trigger: string, message: string}], username: [{trigger: string, message: string, required: boolean},{pattern: RegExp, trigger: string, message: string}]}}
     */
    const loginRules = {
      username: [
        {required: true, message: '请输入用户名', trigger: 'blur'},
        {pattern: /^[a-zA-Z][a-zA-Z0-9_-]{5,}$/, message: '用户名格式不正确', trigger: 'blur'}
      ],
      password: [
        {required: true, message: '请输入密码', trigger: 'blur'},
        {pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, message: '密码格式不正确', trigger: 'blur'}
      ]
    };

    const loginFormRef = ref(null);
    const loginAttempts = ref(0);

    /**
     * 登录事件
     */
    const handleLogin = () => {
      loginFormRef.value.validate(valid => {
        if (valid) {
          if (loginAttempts.value >= 3) {
            // 第四次点击登录时才显示验证码
            isCaptchaVisible.value = true;
            return;
          }
          request.post('/auth/login', loginForm).then(response => {
            if (response.code === 200) {
              ElMessage.success('登录成功');
              const token = response.data.token;
              const roles = response.data.roles;
              store.dispatch('login', {token, roles});
              sessionStorage.setItem('username', loginForm.username);
              sessionStorage.setItem('lastLoginTime', response.data.lastLoginTime);
              sessionStorage.setItem('lastLoginIp', response.data.lastLoginIp);
              router.push('/home/welcome');
              loginAttempts.value = 0; // 登录成功后重置失败次数
            } else {
              handleLoginFailure();
              ElMessage.error(response.message);
            }
          }).catch(error => {
            ElMessage.error('登录失败');
            handleLoginFailure();
            console.error(error);
          });
        }
      });
    };

    /**
     * 忘记密码表单
     * @type {UnwrapNestedRefs<{code: string, newPassword: string, confirmPassword: string, email: string, username: string}>}
     */
    const forgetPasswordFrom = reactive({
      username: '',
      email: '',
      newPassword: '',
      confirmPassword: '',
      code: ''
    });

    /**
     * 忘记密码表单数据校验规则
     * @type {{code: [{trigger: string, message: string, required: boolean}], newPassword: [{trigger: string, message: string, required: boolean},{pattern: RegExp, trigger: string, message: string}], confirmPassword: [{trigger: string, message: string, required: boolean},{validator: *, trigger: string}], email: [{trigger: string, message: string, required: boolean},{trigger: string, type: string, message: string}], username: [{trigger: string, message: string, required: boolean},{pattern: RegExp, trigger: string, message: string}]}}
     */
    const forgetPasswordRules = {
      username: [
        {required: true, message: '请输入用户名', trigger: 'blur'},
        {pattern: /^[a-zA-Z][a-zA-Z0-9_-]{5,}$/, message: '用户名格式不正确', trigger: 'blur'}
      ],
      email: [
        {required: true, message: '请输入邮箱', trigger: 'blur'},
        {type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur'}
      ],
      newPassword: [
        {required: true, message: '请输入新密码', trigger: 'blur'},
        {pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, message: '密码格式不正确', trigger: 'blur'}
      ],
      confirmPassword: [
        {required: true, message: '请再次输入密码', trigger: 'blur'},
        {
          validator: (rule, value, callback) => {
            if (value !== forgetPasswordFrom.newPassword) {
              callback(new Error('两次输入密码不一致'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        }
      ],
      code: [
        {required: true, message: '请输入验证码', trigger: 'blur'},
      ]
    };

    const forgetPasswordFromRef = ref(null);

    /**
     * 重置密码事件
     */
    const handelResetPassword = () => {
      forgetPasswordFromRef.value.validate(valid => {
        if (valid) {
          request.post('/auth/ResetPassword', forgetPasswordFrom).then(response => {
            if (response.code === 200) {
              ElMessage.success('密码重置成功');
              forgetPasswordDialog.value = false;
            } else {
              ElMessage.error(response.message);
            }
          }).catch(error => {
            ElMessage.error('重置失败');
            console.error(error);
          });
        }
      });
    }

    /**
     * 发送验证码表单数据
     * @type {UnwrapNestedRefs<{email: string, username: string}>}
     */
    const sendEmailCodeFrom = reactive({
      username: '',
      email: ''
    });

    /**
     * 发送验证码
     */
    const sendEmailCode = () => {
      const forgetPasswordRefs = toRefs(forgetPasswordFrom);       // 将 forgetPasswordFrom 转换为普通的 ref 对象
      sendEmailCodeFrom.username = forgetPasswordRefs.username.value
      sendEmailCodeFrom.email = forgetPasswordRefs.email.value
      if(sendEmailCodeFrom.email && sendEmailCodeFrom.username){
        request.post('/auth/sendEmailCode', sendEmailCodeFrom).then(response => {
          if (response.code === 200) {
            ElMessage.success('验证码发送成功');
          } else {
            ElMessage.error(response.message);
          }
        }).catch(error => {
          ElMessage.error('验证码发送失败');
          console.error(error);
        });
      }else{
        ElMessage.error('请输入邮箱和用户名');
      }

    }

    // 打开注册页面
    const showRegister = () => {
      router.push({name: 'Register'});
    }

    // 密码强度判断
    const passwordStrength = computed(() => {
      const password = forgetPasswordFrom.newPassword;
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
        return 0; // 不符合正则，强度为 0
      }
      let strength = 0;
      // 判断是否包含大小写字母和数字
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasDigit = /\d/.test(password);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

      // 判断是否包含大小写字母和数字，且数字不连续
      if (hasLowercase && hasUppercase && hasDigit && !/123456|23456|345678|456789|0000|1111|2222|4444|5555|6666|7777|8888|9999/.test(password) && !hasSpecialChar) {
        strength = 2; // 包含大小写字母、数字，且数字不连续
      }
      else if (password.length <= 10 && hasLowercase && hasUppercase && hasDigit && !hasSpecialChar) {
        strength = 1; // 包含大小写字母和数字不包含特殊字符且长度小于10
      }
      else if(password.length > 10 && hasLowercase && hasUppercase && hasDigit && !hasSpecialChar){
        strength = 2; // 包含大小写字母和数字不包含特殊字符且长度大于10
      }
      else {
        strength = 3; // 包含大小写字母、数字、特殊字符
      }
      return strength;
    });


    const forgetPasswordDialog = ref(false);
    const isCaptchaVisible = ref(false);

    // 登录失败时统计次数
    const handleLoginFailure = () => {
      loginAttempts.value += 1;
    };

    // 滑块验证码通过后执行
    const handleCaptchaSuccess = () => {
      isCaptchaVisible.value = false;
      loginAttempts.value = 0; // 重置失败次数
      handleLogin(); // 验证成功后再次尝试登录
    };

    //关闭滑块验证码
    const handleCaptchaClose = () => {
      isCaptchaVisible.value = false;
    };


    // 保存用户名到localStorage
    const saveUsername = () => {
      localStorage.setItem('savedUsername', loginForm.username);
    };

    //钩子函数，实现记住密码
    onMounted(() => {
      // 存储用户名
      const savedUsername = localStorage.getItem('savedUsername');
      if (savedUsername) {
        loginForm.username = savedUsername;
      }
      const savedPassword = Cookies.get('rememberMePwd');
      if (savedPassword) {
        loginForm.password = savedPassword;
        loginForm.rememberMe = true;
      }

    });

    return {
      loginForm,
      loginRules,
      handleLogin,
      showRegister,
      loginFormRef,
      saveUsername,
      isCaptchaVisible,
      handleCaptchaSuccess,
      handleCaptchaClose,
      forgetPasswordFrom,
      forgetPasswordDialog,
      forgetPasswordRules,
      handelResetPassword,
      sendEmailCodeFrom,
      forgetPasswordFromRef,
      sendEmailCode,
      passwordStrength
    };
  }


};
</script>

<style scoped>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 98vh;
  background: linear-gradient(to right, #ff7e5f, #feb47b);
  overflow: hidden;
}

.card {
  width: 400px;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}

.login-card {
  margin-right: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
}

.btn-item {
  text-align: center;
}

.link {
  margin-left: 10px;
  color: #409eff;
  cursor: pointer;
}

.forgetPassword-dialog {
  max-width: 400px;
}


</style>
