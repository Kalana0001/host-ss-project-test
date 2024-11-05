import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LandingPage from './components/LandingPage/LandingPage';
import SignUp from './components/SignUp/SignUp';
import SignIn from './components/SignIn/SignIn';

function App() {
  return (
    <div className="App">
        <BrowserRouter>
        <ToastContainer position="top-center" style={{marginTop: "70px"}}/>
            <main>
              <Routes>
                <Route path='/' element={<LandingPage/>}/>
                <Route path='/signup' element={<SignUp/>}/>
                <Route path="/signin" element={<SignIn/>}/>
              </Routes>
            </main>
        </BrowserRouter>
    </div>
  );
}

export default App;
