import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const Breadcrumb = ({ customItems = null }) => {
  const location = useLocation();

  const getBreadcrumbItems = () => {
    if (customItems) return customItems;

    const pathSegments = location.pathname.split('/').filter(segment => segment);
    
    const items = [
      { name: 'Dashboard', href: '/', icon: HomeIcon }
    ];

    const routeMap = {
      'new-scan': { name: 'New Scan', href: '/new-scan' },
      'analytics': { name: 'Analytics', href: '/analytics' },
      'settings': { name: 'Settings', href: '/settings' },
      'scan': { name: 'Scan Details', href: null } // Dynamic
    };

    pathSegments.forEach((segment, index) => {
      const route = routeMap[segment];
      if (route) {
        const href = route.href || `/${pathSegments.slice(0, index + 1).join('/')}`;
        items.push({
          name: route.name,
          href: index === pathSegments.length - 1 ? null : href // Last item is not clickable
        });
      }
    });

    return items;
  };

  const items = getBreadcrumbItems();

  if (items.length <= 1) return null;

  return (
    <motion.nav 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center space-x-1 text-sm text-gray-500 mb-4"
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isFirst = index === 0;
        
        return (
          <motion.div 
            key={item.href || item.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center"
          >
            {!isFirst && (
              <ChevronRightIcon className="h-4 w-4 text-gray-300 mx-2" />
            )}
            
            {isLast ? (
              <span className="flex items-center text-gray-900 dark:text-white font-medium">
                {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                {item.name}
              </span>
            ) : (
              <Link
                to={item.href}
                className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                {item.name}
              </Link>
            )}
          </motion.div>
        );
      })}
    </motion.nav>
  );
};

export default Breadcrumb;