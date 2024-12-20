import React from 'react'

const StepUsername = ({ onNext }) => {
  return (
    <>
      <div>OTP</div>
      <button onClick={onNext}>Next</button>
    </>
  );
};

export default StepUsername
