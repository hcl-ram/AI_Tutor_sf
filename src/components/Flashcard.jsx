import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCw } from 'lucide-react';

const Flashcard = ({ front, back }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective-1000 w-full max-w-md mx-auto h-64">
      <motion.div
        className="relative w-full h-full cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 card flex items-center justify-center text-center p-6 backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div>
            <div className="mb-4 text-primary-600 font-semibold text-sm uppercase tracking-wide">
              Question
            </div>
            <p className="text-xl font-semibold text-gray-900">{front}</p>
            <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
              <RotateCw size={16} className="mr-2" />
              Click to flip
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 card flex items-center justify-center text-center p-6 backface-hidden bg-gradient-to-br from-primary-50 to-secondary-50"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div>
            <div className="mb-4 text-secondary-600 font-semibold text-sm uppercase tracking-wide">
              Answer
            </div>
            <p className="text-lg text-gray-800">{back}</p>
            <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
              <RotateCw size={16} className="mr-2" />
              Click to flip
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Flashcard;
