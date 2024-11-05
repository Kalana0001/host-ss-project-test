import React from 'react';
import './LandingPage.css';
import background from '../../assets/bg.svg'
import playstore from '../../assets/google-play.jpg'
import appstore from '../../assets/app-store.jpg'

const LandingPage = () => {
  return (
    <div className='landingpage'>
      <nav>
        <div className="nav__header">
          <div className="nav__logo">
            <a href="#">
              Kal<span><i className="fa fa-play">a</i></span>na
            </a>
          </div>
          <div className="nav__menu__btn" id="menu-btn">
            <span><i className="fa fa-bars"></i></span>
          </div>
        </div>
        <div className="nav__btns">
          <a href='/signup' className="lbtn">SIGN UP</a>
          <a href='/signin' className="lbtn">SIGN IN</a>
        </div>
      </nav>
      
      <header className="section__container header__container">
        <div className="header__image">
          <img className="car1" src={background} alt="header" />
        </div>
        <div className="header__content">
          <h2> Higher National Diploma in Software Engineering (HNDSE)-23.3F</h2>
          <h1>SECURE WRAPPER APPLICATION </h1>
          <p className='lpara'>
            <b>Course Module-Software Security</b>
          </p>
          <p className='lpara'>
            <b>Student Number-GAHDSE23.3F-014</b>
          </p>
          <div className="header__btns">
            <a href="#">
              <img src={playstore}alt="google-play" />
            </a>
            <a href="#">
              <img src={appstore}alt="app-store" />
            </a>
          </div>
        </div>
      </header>
    </div>
  );
};

export default LandingPage;
