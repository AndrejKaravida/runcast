import { forwardRef, type ReactNode, type RefAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { buttonClassName, type ButtonSize, type ButtonVariant } from '@/components/ui/button-styles';

interface AppLinkButtonProps extends LinkProps, RefAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

export const AppLinkButton = forwardRef<HTMLAnchorElement, AppLinkButtonProps>(function AppLinkButton(
  { variant = 'primary', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <Link ref={ref} className={buttonClassName(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
});
