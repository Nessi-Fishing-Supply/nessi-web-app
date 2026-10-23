import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './dropdown.module.scss';

interface DropdownProps {
  children: React.ReactNode;
  label?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
}

interface DropdownItemProps {
  children: React.ReactNode;
  isClickable?: boolean;
}

interface DropdownTitleProps {
  children: React.ReactNode;
}

const DropdownContext = React.createContext({ closeDropdown: () => {} });

// DropdownItem component
const DropdownItem: React.FC<DropdownItemProps> = ({ children, isClickable = true }) => {
  const { closeDropdown } = React.useContext(DropdownContext);

  const handleClick = () => {
    if (isClickable) {
      closeDropdown();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      closeDropdown();
    }
  };

  return (
    <li
      role="menuitem"
      tabIndex={isClickable ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={isClickable ? styles.dropdownItem : styles.dropdownItemNoClick}
    >
      {children}
    </li>
  );
};

// DropdownTitle component
const DropdownTitle: React.FC<DropdownTitleProps> = ({ children }) => {
  return (
    <li role="presentation" className={styles.dropdownTitle}>
      {children}
    </li>
  );
};

// DropdownDivider component
const DropdownDivider: React.FC = () => {
  return <li role="separator" className={styles.dropdownDivider} />;
};

// Dropdown component
const Dropdown: React.FC<DropdownProps> = ({ children, label, icon, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = triggerRef.current?.parentElement;
      if (container && !container.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const margin = 24;

      if (dropdownRect.right > window.innerWidth - margin) {
        dropdownRef.current.style.left = `${window.innerWidth - dropdownRect.right - margin}px`;
      }
      if (dropdownRect.left < margin) {
        dropdownRef.current.style.left = `${margin - dropdownRect.left}px`;
      }

      // Focus the first focusable item
      const firstItem = dropdownRef.current.querySelector('[role="menuitem"]') as HTMLElement;
      firstItem?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !dropdownRef.current) return;

    const items = Array.from(
      dropdownRef.current.querySelectorAll('[role="menuitem"][tabindex="0"]'),
    ) as HTMLElement[];
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
    }
  };

  return (
    <DropdownContext.Provider value={{ closeDropdown }}>
      <div className={styles.dropdown}>
        <button
          ref={triggerRef}
          onClick={toggleDropdown}
          className={styles.trigger}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label={ariaLabel}
        >
          {icon ? icon : label}
        </button>
        {isOpen && (
          <ul ref={dropdownRef} role="menu" className={styles.menu} onKeyDown={handleKeyDown}>
            {React.Children.map(children, (child) => {
              if (!React.isValidElement(child)) {
                return <DropdownItem>{child}</DropdownItem>;
              }
              if (
                child.type === DropdownItem ||
                child.type === DropdownTitle ||
                child.type === DropdownDivider
              ) {
                return React.cloneElement(child);
              }
              if (child.type === React.Fragment) {
                return (child as React.ReactElement<{ children: React.ReactNode }>).props.children;
              }
              return <DropdownItem>{child}</DropdownItem>;
            })}
          </ul>
        )}
      </div>
    </DropdownContext.Provider>
  );
};

export { Dropdown, DropdownItem, DropdownTitle, DropdownDivider };
