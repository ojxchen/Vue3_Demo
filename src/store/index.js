import { createStore } from 'vuex'

export default createStore({
  state: {
    token: sessionStorage.getItem('token') || '',
    roles: sessionStorage.getItem('roles') || ''
  },
  getters: {
    isAuthenticated: state => !!state.token, // 检查用户是否已认证
    roles: state => state.roles  // 获取用户角色信息
  },
  mutations: {
    setToken(state, token) {
      state.token = token; // 设置 token
      sessionStorage.setItem('token', token);
    },
    clearToken(state) {
      state.token = '';
      sessionStorage.removeItem('token');
    },
    setRoles(state, roles) {
      state.roles = roles;
      sessionStorage.setItem('roles', roles);
    },
    clearRoles(state) {
      state.roles = '';
      sessionStorage.removeItem('roles');
    }
  },
  actions: {
    login({ commit }, { token, roles }) {
      commit('setToken', token);
      commit('setRoles', roles);
    },
    logout({ commit }) {
      commit('clearToken');
      commit('clearRoles');
    }
  },
  modules: {
  }
})
