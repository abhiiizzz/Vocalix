import React from "react";
import Card from "../../../../components/shared/Card/Card";
import Button from "../../../../components/shared/Button/Button";
import TextInput from "../../../../components/shared/TextInput/TextInput";
import styles from "../StepPhoneEmail.module.css";
import { sendEmailOtp } from "../../../../http/index";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setEmailOtp } from "../../../../store/authSlice";

const Email = ({ onNext }) => {
  const [emailId, setEmail] = useState("");
  const dispatch = useDispatch();

  async function submit() {
    if (!emailId) return;
    const { data } = await sendEmailOtp({ email: emailId });
    console.log(data);
    dispatch(setEmailOtp({ email: data.email, hash: data.hash }));
    onNext();
  }

  return (
    <Card title="Enter your email id" icon="email-emoji">
      <TextInput value={emailId} onChange={(e) => setEmail(e.target.value)} />
      <div>
        <div className={styles.actionButtonWrap}>
          <Button text="Next" onClick={submit} />
        </div>

        <p className={styles.bottomParagraph}>
          By entering your number, you’re agreeing to our Terms of Service and
          Privacy Policy. Thanks!
        </p>
      </div>
    </Card>
  );
};

export default Email;
