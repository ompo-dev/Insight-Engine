"use client";

import Link from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams
} from "next/navigation";
import {
  Children,
  Fragment,
  isValidElement,
  type AnchorHTMLAttributes,
  type ComponentType,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode
} from "react";

type RouteChildRender<TParams extends Record<string, string> = Record<string, string>> = (
  params: TParams
) => ReactNode;

export function useLocation(): [string, (href: string) => void] {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  return [pathname, (href: string) => router.push(href)];
}

export function useSearch() {
  const searchParams = useSearchParams();
  const serialized = searchParams?.toString() ?? "";
  return serialized ? `?${serialized}` : "";
}

export function useParams<TParams extends Record<string, string>>() {
  return (useNextParams<TParams>() ?? {}) as TParams;
}

export function useRoute<TParams extends Record<string, string> = Record<string, string>>(pattern: string) {
  const pathname = usePathname() ?? "/";

  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);

  const params = {} as TParams;

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];

    if (patternSegment === "*") {
      return [true, params] as const;
    }

    if (!pathSegment) {
      return [false, null] as const;
    }

    if (patternSegment.startsWith(":")) {
      params[patternSegment.slice(1) as keyof TParams] = pathSegment as TParams[keyof TParams];
      continue;
    }

    if (patternSegment !== pathSegment) {
      return [false, null] as const;
    }
  }

  return [patternSegments.length === pathSegments.length, params] as const;
}

export function Router({ children }: PropsWithChildren<{ base?: string }>) {
  return <>{children}</>;
}

export function Switch({ children }: PropsWithChildren) {
  const validChildren = Children.toArray(children).filter(isValidElement);
  return <>{(validChildren[0] as ReactNode) ?? null}</>;
}

export function Route<TParams extends Record<string, string> = Record<string, string>>({
  component: Component,
  children
}: {
  path?: string;
  component?: ComponentType<any>;
  children?: ReactNode | RouteChildRender<TParams>;
}) {
  const params = useNextParams<TParams>();

  if (Component) {
    return <Component {...params} />;
  }

  if (typeof children === "function") {
    return <Fragment>{children((params ?? ({} as TParams)) as TParams)}</Fragment>;
  }

  return <>{children ?? null}</>;
}

export function LinkCompat({
  href,
  children,
  ...props
}: PropsWithChildren<{ href: string } & AnchorHTMLAttributes<HTMLAnchorElement>>) {
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

export { LinkCompat as Link };
