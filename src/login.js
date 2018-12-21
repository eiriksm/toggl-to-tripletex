module.exports = (user, password) => {
  jQuery('#username').val(user)
  jQuery('#password').val(password)
  jQuery('#loginButton').click()
}