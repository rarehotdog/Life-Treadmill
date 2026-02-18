import { ChevronRight } from 'lucide-react';
import type { UserProfile } from '../../types/app';
import { Button, Card, CardContent, Switch } from '../ui';

interface ProfileScreenProps {
  profile: UserProfile;
  onStartCustomization?: () => void;
  isCustomized?: boolean;
}

export default function ProfileScreen({ profile, onStartCustomization, isCustomized = false }: ProfileScreenProps) {
  const menuSections = [
    {
      items: [
        { label: 'Settings', hasArrow: true },
        { label: 'App Language', hasArrow: true },
        { label: 'Notifications', hasToggle: true, enabled: true },
      ],
    },
    {
      items: [
        { label: 'Help Center', hasArrow: true },
        { label: 'Feedback', hasArrow: true },
      ],
    },
    {
      items: [{ label: 'Share With Friends', hasArrow: true }],
    },
  ];

  const footerLinks = ['Purchase History', 'Privacy Policy', 'Help Center', 'Log out', 'Delete account'];

  return (
    <div data-testid="screen-profile" className="min-h-screen bg-gray-100 pb-24">
      <div className="screen-wrap-tight flex items-center justify-between border-b border-gray-200 bg-white">
        <h1 className="heading-1 text-gray-900">Profile</h1>
        <Button variant="link" className="h-auto p-0 font-semibold text-blue-500">Done</Button>
      </div>

      <div className="screen-wrap-tight space-y-4">
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="space-y-4 card-padding">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-xl font-bold text-white">
                {profile.name ? profile.name[0].toUpperCase() : 'ツ'}
              </div>
              <div className="flex-1">
                <h2 className="heading-3">{profile.name || '태현'}</h2>
                <p className="body-14 text-gray-500">
                  Joined{' '}
                  {new Date(profile.joinedDate || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {!isCustomized && onStartCustomization ? (
              <Button
                onClick={onStartCustomization}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"
              >
                나만의 목표 설정하기
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {menuSections.map((section, sectionIndex) => (
          <Card key={sectionIndex} className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-0">
              {section.items.map((item, itemIndex) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  className={`h-auto w-full justify-between rounded-none px-5 py-4 body-15 font-normal ${
                    itemIndex !== section.items.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span>{item.label}</span>
                  {item.hasArrow ? <ChevronRight className="h-5 w-5 text-gray-400" /> : null}
                  {item.hasToggle ? <Switch checked={item.enabled} aria-label={item.label} /> : null}
                </Button>
              ))}
            </CardContent>
          </Card>
        ))}

        <div className="space-y-2 px-1 py-2">
          {footerLinks.map((label) => (
            <Button key={label} variant="link" className="h-auto p-0 text-sm font-medium text-blue-500">
              {label}
            </Button>
          ))}
        </div>

        <Card className="rounded-2xl border-blue-100 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardContent className="space-y-3 card-padding">
            <h3 className="heading-3">Current Goal</h3>
            <p className="body-14 text-gray-700">{profile.goal}</p>
            <div className="flex items-center gap-4 body-14">
              <div>
                <span className="text-gray-500">Deadline:</span>
                <span className="ml-1 font-semibold">{profile.deadline}</span>
              </div>
              <div>
                <span className="text-gray-500">Streak:</span>
                <span className="ml-1 font-semibold">{profile.streak} days 🔥</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
