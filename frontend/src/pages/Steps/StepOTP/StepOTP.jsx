import React,{useState} from 'react'
import Card from "../../../components/shared/Card/Card";
import TextInput from '../../../components/shared/TextInput/TextInput';
import Button from "../../../components/shared/Button/Button";
import styles from "./StepOTP.module.css";
import { useDispatch } from "react-redux";
import { verifyOtp } from '../../../http';
import { useSelector } from 'react-redux';
import {setAuth} from '../../../store/authSlice';

const StepOTP = ({ onNext }) => {
  const [otp, setOtp] = useState("");
  const dispatch=useDispatch();
  const {phone,hash}= useSelector((state)=>state.auth.otp);
  async function submit(){
    if(!otp||!phone||!hash)return;

    try{
      const {data}= await verifyOtp({otp,phone,hash});
      console.log(data);
      dispatch(setAuth(data));
    }catch(err){
      console.log(err);
    }
    //onNext();
  }
  return (
    <>
      <div className={styles.cardWrapper}>
        <Card title="Enter the code we just texted you" icon="lock-emoji">
          <TextInput value={otp} onChange={(e) => setOtp(e.target.value)} />
          <div className={styles.actionButtonWrap}>
            <Button  text="Next" onClick={submit}/>
          </div>
          <p className={styles.bottomParagraph}>
            By entering your number, you’re agreeing to our Terms of Service and
            Privacy Policy. Thanks!
          </p>
        </Card>
      </div>
    </>
  );

};

export default StepOTP
