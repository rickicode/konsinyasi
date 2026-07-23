<script lang="ts">
  import { cn } from '$lib/utils/cn.js';
  import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BarChart3,
    Camera,
    Check,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    DollarSign,
    Edit,
    FileText,
    Home,
    Info,
    Loader2,
    LogOut,
    Mail,
    MapPin,
    MapPinOff,
    MapPinned,
    Menu,
    Minus,
    Navigation,
    Package,
    PackageOpen,
    Phone,
    Plus,
    RotateCcw,
    Search,
    Settings,
    Shield,
    Smartphone,
    Store,
    Trash2,
    Upload,
    User,
    Users,
    WifiOff,
    X,
    XCircle,
  } from 'lucide-svelte';
  import type { Component } from 'svelte';
  export type IconName =
    | 'alert-circle'
    | 'alert-triangle'
    | 'arrow-left'
    | 'arrow-right'
    | 'bar-chart-3'
    | 'camera'
    | 'check'
    | 'check-circle'
    | 'chevron-down'
    | 'chevron-left'
    | 'chevron-right'
    | 'chevron-up'
    | 'clock'
    | 'dollar-sign'
    | 'edit'
    | 'file-text'
    | 'home'
    | 'info'
    | 'loader-2'
    | 'log-out'
    | 'mail'
    | 'map-pin'
    | 'map-pin-off'
    | 'map-pinned'
    | 'menu'
    | 'minus'
    | 'navigation'
    | 'package'
    | 'package-open'
    | 'phone'
    | 'plus'
    | 'rotate-ccw'
    | 'search'
    | 'settings'
    | 'shield'
    | 'smartphone'
    | 'store'
    | 'trash-2'
    | 'upload'
    | 'user'
    | 'users'
    | 'wifi-off'
    | 'x'
    | 'x-circle';
  type Props = {
    name?: IconName;
    icon?: Component<{ size?: number | string; color?: string; class?: string }>;
    size?: number | string;
    color?: string;
    class?: string;
  };
  let { name, icon, size = 20, color = 'currentColor', class: className = '' }: Props = $props();
  const icons: Record<
    IconName,
    Component<{ size?: number | string; color?: string; class?: string }>
  > = {
    'alert-circle': AlertCircle,
    'alert-triangle': AlertTriangle,
    'arrow-left': ArrowLeft,
    'arrow-right': ArrowRight,
    'bar-chart-3': BarChart3,
    camera: Camera,
    check: Check,
    'check-circle': CheckCircle,
    'chevron-down': ChevronDown,
    'chevron-left': ChevronLeft,
    'chevron-right': ChevronRight,
    'chevron-up': ChevronUp,
    clock: Clock,
    'dollar-sign': DollarSign,
    edit: Edit,
    'file-text': FileText,
    home: Home,
    info: Info,
    'loader-2': Loader2,
    'log-out': LogOut,
    mail: Mail,
    'map-pin': MapPin,
    'map-pin-off': MapPinOff,
    'map-pinned': MapPinned,
    menu: Menu,
    minus: Minus,
    navigation: Navigation,
    package: Package,
    'package-open': PackageOpen,
    phone: Phone,
    plus: Plus,
    'rotate-ccw': RotateCcw,
    search: Search,
    settings: Settings,
    shield: Shield,
    smartphone: Smartphone,
    store: Store,
    'trash-2': Trash2,
    upload: Upload,
    user: User,
    users: Users,
    'wifi-off': WifiOff,
    x: X,
    'x-circle': XCircle,
  };
  const IconComponent = $derived(icon ?? (name ? icons[name] : undefined));
</script>

{#if IconComponent}
  <IconComponent {size} {color} class={cn('shrink-0', className)} />
{/if}
