import React from 'react';
import { Package, Shirt } from 'lucide-react';
import { ORDER_VIEWS } from '../constants';

const AreaIcon = ({ area, size = 22, ...props }) => {
    const iconProps = { size, 'aria-hidden': true, ...props };
    if (area === ORDER_VIEWS.PREPARACION) return <Shirt {...iconProps} />;
    if (area === ORDER_VIEWS.EMPAQUETADO) return <Package {...iconProps} />;

    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" {...props}>
            {area === ORDER_VIEWS.ESTAMPADO ? (
                <>
                    <path d="M3 17h18l-2-8H9a6 6 0 0 0-6 6v2Z" />
                    <path d="M9 9V5h6a3 3 0 0 1 3 3v1M3 20h18M19 9h1a2 2 0 0 0 2-2V4" />
                    <path d="M6 14h.01" />
                </>
            ) : (
                <>
                    <path d="M12 4v10" strokeWidth="3" />
                    <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
                </>
            )}
        </svg>
    );
};

export default AreaIcon;
