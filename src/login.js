module.exports = (user, password) => {
  window.jQuery('#username').val(user)
  window.jQuery('#password').val(password)
  jQuery('#loginButton').click()
}