import Select from 'react-select';
import { cn } from '../../lib/utils';

export function SearchSelect({ options, value, onChange, placeholder, className, ...props }) {
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'hsl(var(--background))',
      borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
      borderRadius: '0.5rem',
      boxShadow: state.isFocused ? '0 0 0 2px hsla(var(--primary), 0.25)' : 'none',
      '&:hover': { borderColor: 'hsl(var(--primary))' },
      minHeight: '36px',
      fontSize: '0.875rem',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'hsl(var(--primary))' : state.isFocused ? 'hsl(var(--accent))' : 'transparent',
      color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
      '&:hover': { backgroundColor: 'hsl(var(--accent))' },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))',
    }),
  };

  return (
    <Select
      styles={customStyles}
      options={options}
      value={options.find(o => o.value === value) || null}
      onChange={(selected) => onChange(selected ? selected.value : '')}
      placeholder={placeholder || 'Seleccionar...'}
      isClearable
      className={cn('w-full', className)}
      classNamePrefix="react-select"
      {...props}
    />
  );
}