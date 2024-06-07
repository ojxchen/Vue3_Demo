<template>
  <div>
    <table>
      <thead>
      <tr>
        <th>用户名</th>
        <th>上次登录时间</th>
        <th>上次登录地址</th>
        <th>操作</th>
      </tr>
      </thead>
      <tbody>
      <tr>
        <td>{{ userForm.username }}</td>
        <td>{{ userForm.lastLoginTime }}</td>
        <td>{{ userForm.lastLoginIp }}</td>
        <td>
          <el-button type="primary" @click="updatePasswordDialog = true">修改密码</el-button>
          <el-button type="success" @click="updateEmailDialog = true">修改邮箱</el-button>
        </td>
      </tr>
      </tbody>
    </table>
  </div>

  <!--修改密码-->
  <el-dialog v-model="updatePasswordDialog" :close-on-click-modal="false" class="updatePassword-dialog"
             title="修改密码">
    <el-form ref="updatePasswordFromRef" :model="updatePasswordFrom" :rules="updatePasswordRules" label-width="0px">
      <el-form-item prop="oldPassword">
        <el-input v-model="updatePasswordFrom.oldPassword" placeholder="旧密码" type="password"></el-input>
      </el-form-item>
      <el-form-item prop="newPassword">
        <el-input v-model="updatePasswordFrom.newPassword" placeholder="新密码" type="password"></el-input>
        <div v-if="passwordStrength > 0" class="password-strength">
          <el-button :type="passwordStrength === 1 ? 'success' : 'default'">弱</el-button>
          <el-button :type="passwordStrength === 2 ? 'warning' : 'default'">中</el-button>
          <el-button :type="passwordStrength === 3 ? 'danger' : 'default'">强</el-button>
        </div>
      </el-form-item>
      <el-form-item prop="confirmPassword">
        <el-input v-model="updatePasswordFrom.confirmPassword" placeholder="确认密码" type="password"></el-input>
      </el-form-item>
      <el-form-item class="btn-item">
        <el-button type="primary" @click="handelUpdatePassword">修改密码</el-button>
        <el-button @click="updatePasswordDialog = false">取消</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>

  <!--修改邮箱-->
  <el-dialog v-model="updateEmailDialog" :close-on-click-modal="false" class="updateEmail-dialog"
             title="修改邮箱">
    <el-form ref="updateEmailFromRef" :model="updateEmailFrom" :rules="updateEmailRules" label-width="0px">
      <el-form-item prop="newEmail">
        <el-input v-model="updateEmailFrom.newEmail" placeholder="新邮箱"></el-input>
      </el-form-item>
      <el-form-item prop="code" style="display: flex;">
        <el-input v-model="updateEmailFrom.code" placeholder="验证码" style="flex: 1;"></el-input>
        <el-button style="margin-left: 10px;" type="info" @click="sendEmailCode">发送验证码</el-button>
      </el-form-item>
      <el-form-item class="btn-item">
        <el-button type="primary" @click="handelUpdateEmail">修改邮箱</el-button>
        <el-button @click="updateEmailDialog = false">取消</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>


</template>

<script>
import {computed, reactive, ref, toRefs} from 'vue';
import {useRouter} from 'vue-router';
import {useStore} from 'vuex';
import request from "@/api/request";
import {ElMessage} from "element-plus";

export default {
  name: 'User',
  setup() {
    const store = useStore();
    const router = useRouter();

    /**
     * 登录用户数据
     * @type {UnwrapNestedRefs<{lastLoginTime: string, username: string, lastLoginIp: string}>}
     */
    const userForm = reactive({
      username: sessionStorage.getItem('username'),
      lastLoginTime: sessionStorage.getItem('lastLoginTime'),
      lastLoginIp: sessionStorage.getItem('lastLoginIp')
    });

    /**
     * 修改密码表单
     * @type {UnwrapNestedRefs<{oldPassword: string, newPassword: string, confirmPassword: string}>}
     */
    const updatePasswordFrom = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    /**
     * 修改密码表单校验规则
     * @type {{oldPassword: [{trigger: string, message: string, required: boolean},{pattern: RegExp, trigger: string, message: string}], newPassword: [{trigger: string, message: string, required: boolean},{pattern: RegExp, trigger: string, message: string}], confirmPassword: [{trigger: string, message: string, required: boolean},{validator: *, trigger: string}]}}
     */
    const updatePasswordRules = {
      oldPassword: [
        {required: true, message: '请输入旧密码', trigger: 'blur'},
        {pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, message: '密码格式不正确', trigger: 'blur'}
      ],
      newPassword: [
        {required: true, message: '请输入新密码', trigger: 'blur'},
        {pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, message: '密码格式不正确', trigger: 'blur'}
      ],
      confirmPassword: [
        {required: true, message: '请再次输入密码', trigger: 'blur'},
        {
          validator: (rule, value, callback) => {
            if (value !== updatePasswordFrom.newPassword) {
              callback(new Error('两次输入密码不一致'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        }
      ]
    };

    const updatePasswordDialog = ref(false);
    const updatePasswordFromRef = ref(null);
    /**
     * 修改密码事件
     */
    const handelUpdatePassword = () => {
      updatePasswordFromRef.value.validate(valid => {
        if (valid) {
          request.post('/auth/update-Password', updatePasswordFrom).then(response => {
            if (response.code === 200) {
              ElMessage.success('修改成功');
              updatePasswordDialog.value = false;
              sessionStorage.clear();
              router.push('/')
            } else {
              ElMessage.error(response.message);
            }
          }).catch(error => {
            ElMessage.error('修改失败');
            console.error(error);
          });
        }
      });
    }

    // 密码强度判断
    const passwordStrength = computed(() => {
      const password = updatePasswordFrom.newPassword;
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
      } else if (password.length <= 10 && hasLowercase && hasUppercase && hasDigit && !hasSpecialChar) {
        strength = 1; // 包含大小写字母和数字不包含特殊字符且长度小于10
      } else if (password.length > 10 && hasLowercase && hasUppercase && hasDigit && !hasSpecialChar) {
        strength = 2; // 包含大小写字母和数字不包含特殊字符且长度大于10
      } else {
        strength = 3; // 包含大小写字母、数字、特殊字符
      }
      return strength;
    });

    /**
     * 修改邮箱表单
     * @type {UnwrapNestedRefs<{code: string, newEmail: string}>}
     */
    const updateEmailFrom = reactive({
      newEmail: '',
      code: ''
    });

    /**
     * 修改邮箱校验规则
     * @type {{code: [{trigger: string, message: string, required: boolean}], newEmail: [{trigger: string, message: string, required: boolean},{trigger: string, type: string, message: string}]}}
     */
    const updateEmailRules = {
      newEmail: [
        {required: true, message: '请输入新邮箱', trigger: 'blur'},
        {type: 'email', message: '请输入有效的新邮箱地址', trigger: 'blur'}
      ],
      code: [
        {required: true, message: '请输入验证码', trigger: 'blur'},
      ]
    }

    const updateEmailDialog = ref(false)
    const updateEmailFromRef = ref(null);

    /**
     * 修改邮箱事件
     */
    const handelUpdateEmail = () => {
      updateEmailFromRef.value.validate(valid => {
        if (valid) {
          request.post('/auth/update-Email', updateEmailFrom).then(response => {
            if (response.code === 200) {
              ElMessage.success('修改成功');
              updateEmailDialog.value = false;
            } else {
              ElMessage.error(response.message);
            }
          }).catch(error => {
            ElMessage.error('修改失败');
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
      const userFormRefs = toRefs(userForm);
      const updateEmailFromRefs = toRefs(updateEmailFrom)
      sendEmailCodeFrom.username = userFormRefs.username.value
      sendEmailCodeFrom.email = updateEmailFromRefs.newEmail.value
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


    return {
      userForm,
      updatePasswordFrom,
      updatePasswordFromRef,
      updatePasswordRules,
      passwordStrength,
      updatePasswordDialog,
      handelUpdatePassword,
      updateEmailFrom,
      updateEmailRules,
      updateEmailDialog,
      updateEmailFromRef,
      handelUpdateEmail,
      sendEmailCode
    };
  }
};
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

</style>
