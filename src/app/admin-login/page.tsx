import { loginAdmin } from '$/actions/auth'
import LoginForm from '$/components/LoginForm'

const AdminLoginPage = () => <LoginForm title="Admin Login" action={loginAdmin} />

export default AdminLoginPage
