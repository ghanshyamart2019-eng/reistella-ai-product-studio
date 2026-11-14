import React from 'react';

interface SpinnerProps {
  message: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-white border border-[#E6E1D6] rounded-xl">
      <div className="h-9 w-9 rounded-full border-2 border-[#E6E1D6] border-t-[#B59449] animate-spin mb-4" />
      <p className="text-base font-medium text-[#0F1B33]">{message}</p>
    </div>
  );
};

export default Spinner;
