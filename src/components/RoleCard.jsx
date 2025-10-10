import React from 'react';
import { motion } from 'framer-motion';
const RoleCard = ({ icon: Icon, title, description, gradient }) => {

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -10 }}
      whileTap={{ scale: 0.98 }}
      className="card group relative overflow-hidden"
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
      
      <div className="relative z-10 text-center space-y-4 p-6">
        {/* Icon */}
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6 }}
          className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
        >
          <Icon className="text-white" size={40} />
        </motion.div>

        {/* Title */}
        <h3 className="text-2xl font-display font-bold text-gray-900">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-600">
          {description}
        </p>

        {/* Removed CTA button to avoid unauthenticated navigation */}
      </div>
    </motion.div>
  );
};

export default RoleCard;
