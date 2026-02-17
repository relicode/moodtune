import { loginVenueUser } from '$/actions/auth'
import LoginForm from '$/components/LoginForm'

const MainPage = () => <LoginForm title="Moodtune" action={loginVenueUser} />

export default MainPage
