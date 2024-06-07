<template>
  <div class="container">
    <el-card class="card login-card">
      <div class="title">用户注册</div>
      <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="0px">
        <el-form-item prop="username">
          <el-input v-model="registerForm.username" placeholder="用户名"></el-input>
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="registerForm.email" placeholder="邮箱"></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="registerForm.password" placeholder="密码" type="password"></el-input>
          <div v-if="passwordStrength > 0" class="password-strength">
            <el-button :type="passwordStrength === 1 ? 'success' : 'default'">弱</el-button>
            <el-button :type="passwordStrength === 2 ? 'warning' : 'default'">中</el-button>
            <el-button :type="passwordStrength === 3 ? 'danger' : 'default'">强</el-button>
          </div>
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model="registerForm.confirmPassword" placeholder="确认密码" type="password"></el-input>
        </el-form-item>
        <el-form-item prop="code" style="display: flex;">
          <el-input v-model="registerForm.code" placeholder="验证码" style="flex: 1;"></el-input>
          <el-button style="margin-left: 10px;" type="info" @click="sendEmailCode">发送验证码</el-button>
        </el-form-item>
        <el-form-item class="btn-item">
          <el-button type="primary" @click="validateFormAndShowCaptcha">注册</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>

  <!--滑块验证码-->
  <div v-if="isCaptchaVisible" class="captcha-overlay">
    <Vcode :show="isCaptchaVisible" @close="handleCaptchaClose" @success="handleCaptchaSuccess"/>
  </div>

</template>


<script>
import {ref, reactive, computed, toRefs} from 'vue';
import {useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import request from '@/api/request';
import Vcode from 'vue3-puzzle-vcode';

export default {
  name: 'Register',
  components: { Vcode },
  setup() {
    const router = useRouter();

    /**
     * 注册表单数据
     * @type {UnwrapNestedRefs<{password: string, code: string, confirmPassword: string, email: string, username: string}>}
     */
    const registerForm = reactive({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      code:''
    });

    /**
     * 注册表单数据校验规则
     * @type {{password: [{trigger: string, message: string, required: boolean},{pattern: RegExp, trigger: string, message: string}], code: [{trigger: string, message: string, required: boolean}], confirmPassword: [{trigger: string, message: string, required: boolean},{validator: *, trigger: string}], email: [{trigger: string, message: string, required: boolean},{trigger: string, type: string, message: string}], username: [{trigger: string, message: string, required: boolean},{pattern: RegExp, trigger: string, message: string}]}}
     */
    const registerRules = {
      username: [
        {required: true, message: '请输入用户名', trigger: 'blur'},
        {pattern: /^[a-zA-Z][a-zA-Z0-9_-]{5,}$/, message: '用户名格式不正确', trigger: 'blur'}
      ],
      email: [
        {required: true, message: '请输入邮箱', trigger: 'blur'},
        {type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur'}
      ],
      password: [
        {required: true, message: '请输入密码', trigger: 'blur'},
        {pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, message: '密码格式不正确', trigger: 'blur'}
      ],
      code: [
        {required: true, message: '请输入验证码', trigger: 'blur'},
      ],
      confirmPassword: [
        {required: true, message: '请再次输入密码', trigger: 'blur'},
        {
          validator: (rule, value, callback) => {
            if (value !== registerForm.password) {
              callback(new Error('两次输入密码不一致'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        },
      ]
    };

    const isCaptchaVisible = ref(false);
    const registerFormRef = ref(null);
    /**
     * 注册事件
     */
    const handleRegister = () => {
      registerFormRef.value.validate(valid => {
        if (valid) {
          request.post('/auth/register', registerForm).then(response => {
            if (response.code === 200) {
              ElMessage.success('注册成功');
              router.push('/');
              localStorage.setItem('savedUsername', registerForm.username);
            } else {
              ElMessage.error(response.message);
            }
          }).catch(error => {
            ElMessage.error('注册失败');
            console.error(error);
          });
        }else{
          ElMessage.error('请完成验证码验证');
        }
      });
    };

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
      const registerFormRefs = toRefs(registerForm);       // 将 registerForm 转换为普通的 ref 对象
      sendEmailCodeFrom.username = registerFormRefs.username.value
      sendEmailCodeFrom.email = registerFormRefs.email.value
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


    /**
     * 密码强度判断
     * @type {ComputedRef<number|number>}
     */
    const passwordStrength = computed(() => {
      const password = registerForm.password;
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

    //点击注册时打开滑块验证码
    const validateFormAndShowCaptcha = () => {
      registerFormRef.value.validate(valid => {
        if (valid) {
          isCaptchaVisible.value = true;
        }
      });
    };

    //滑块验证码通过执行注册
    const handleCaptchaSuccess = () => {
      isCaptchaVisible.value = false;
      handleRegister();
    };

    //滑块验证码关闭
    const handleCaptchaClose = () => {
      isCaptchaVisible.value = false;
    };


    return {
      registerForm,
      registerRules,
      handleRegister,
      registerFormRef,
      passwordStrength,
      isCaptchaVisible,
      validateFormAndShowCaptcha,
      handleCaptchaSuccess,
      handleCaptchaClose,
      sendEmailCodeFrom,
      sendEmailCode
    }
  }
}


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
  height: 97vh;
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

.password-strength {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

</style>