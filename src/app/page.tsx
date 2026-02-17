import { login } from '$/actions/auth'
import LoginForm from '$/components/LoginForm'

const MainPage = () => <LoginForm title="Moodtune" action={login} />

export default MainPage
