import React, { useState } from "react";
import Card from "../../../components/shared/Card/Card";
import TextInput from "../../../components/shared/TextInput/TextInput";
import Button from "../../../components/shared/Button/Button";
import styles from "./StepOTP.module.css";
import { useDispatch } from "react-redux";
import { verifyOtp,verifyEmailOtp } from "../../../http";
import { useSelector } from "react-redux";
import { setAuth } from "../../../store/authSlice";

const StepOTP = ({ onNext }) => {
  const [otp, setOtp] = useState("");
  const dispatch = useDispatch();
  const { email, phone, hash } = useSelector((state) => state.auth.otp);

  async function submit() {
    // Ensure otp and hash exist, and that at least one contact method is provided.
    if (
      !otp ||
      !hash ||
      ((!phone || phone.trim() === "") && (!email || email.trim() === ""))
    )
      return;

    try {
      if (phone && phone.trim() !== "") {
        // Phone is provided; use verifyOtp for phone-based verification.
        const { data } = await verifyOtp({ otp, phone, hash });
        console.log(data);
        dispatch(setAuth(data));
      } else if (email && email.trim() !== "") {
        // Phone is empty but email is provided; use verifyEmailOtp for email-based verification.
        const { data } = await verifyEmailOtp({ otp, email, hash });
        console.log(data);
        dispatch(setAuth(data));
      }
    } catch (err) {
      console.log(err);
    }
    // onNext();
  }

  return (
    <>
      <div className={styles.cardWrapper}>
        <Card title="Enter the code we just texted you" icon="lock-emoji">
          <TextInput value={otp} onChange={(e) => setOtp(e.target.value)} />
          <div className={styles.actionButtonWrap}>
            <Button text="Next" onClick={submit} />
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

export default StepOTP;
