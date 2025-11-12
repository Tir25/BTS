// Ensure React JSX types are available
import React from 'react';
import type {} from 'react';
import type {} from 'react-dom';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

