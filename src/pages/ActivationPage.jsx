import React from 'react';
import { MobileContainer } from '../components/layout/MobileContainer';
import { ActivationFlow } from '../components/activation/ActivationFlow';
import { useNavigate } from 'react-router-dom';

export default function ActivationPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    // 直接进入对应的播放器页面，默认此处跳转到 `/p` 路由
    navigate('/p');
  };

  return (
    <MobileContainer backdropImage="/bg7.png">
      <div className="relative flex-1 w-full h-full">
        <ActivationFlow onClose={handleClose} />
      </div>
    </MobileContainer>
  );
}
