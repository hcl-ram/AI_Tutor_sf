import React from 'react';
import { motion } from 'framer-motion';

const ProgressBar = ({ progress, height = 'h-3', showLabel = true, color = 'primary' }) => {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    secondary: 'from-secondary-500 to-secondary-600',
    accent: 'from-accent-500 to-accent-600',
    success: 'from-green-500 to-green-600',
    warning: 'from-yellow-500 to-yellow-600',
    danger: 'from-red-500 to-red-600',
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${height}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`${height} bg-gradient-to-r ${colorClasses[color]} rounded-full shadow-sm`}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-right text-sm font-medium text-gray-600">
          {progress}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
