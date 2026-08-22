import '../styles/hero.css'
import { useNavigate } from 'react-router-dom';
import herobg from '../../assets/hero-bg.webp'
import { getRedirectPathForRole, getStoredUser } from '../../utils/auth';

const HeroSection = () => {

  const navigate = useNavigate();
  const user = getStoredUser();

  const navigateSignin = () => {
    if(user){
      navigate(getRedirectPathForRole(user.role))
    }
    else{
      navigate('/signin')
    }
  }

  return (
    <div className="hero-container">
      <div className="hero-content">
        <div className="hero-text select-none">
          <h1 className="hero-title">Your Home Away from Home</h1>
          <p className="hero-subtitle">Rishabh Hotel feels like Home</p>
          <button className="hero-button" onClick={navigateSignin}>Book Now</button>
        </div>
        <div className="hero-icon">
            <img src={herobg} alt="Rishabh Software Logo" id='nav-logo' width="500px" draggable='false'/>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;