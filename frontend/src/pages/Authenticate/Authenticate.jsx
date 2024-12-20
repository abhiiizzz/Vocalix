import React, { useState } from "react";
import StepPhoneEmail from "../Steps/StepPhoneEmail/StepPhoneEmail";
import StepOTP from "../Steps/StepOTP/StepOTP";

const steps = {
  1: StepPhoneEmail,
  2: StepOTP,
};
const Authenticate = () => {
  function onNext() {
    setStep(step + 1);
  }
  const [step, setStep] = useState(1);
  const Step = steps[step];

  return <Step onNext={onNext} />;
};

export default Authenticate;
