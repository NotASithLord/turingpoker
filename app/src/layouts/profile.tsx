import { Link, NavLink, Outlet } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, UserButton, UserProfile } from "@clerk/clerk-react";
import Logo from '../../static/images/logo-dark.png'
import MobileLogo from '../../static/images/logo.png'
import { ReactNode } from 'react';
import useSmallScreen from '@app/hooks/useSmallScreen';
import { DiscordLogoIcon, GearIcon } from '@radix-ui/react-icons';
import Keys from '@app/pages/user/keys';
import Header from '@app/components/Header';

const menuItems = [
  { link: "/games", label: "Games" },
  { link: "/learn", label: "Learn" },
  { link: "https://discord.gg/kz5ed2Q4QP", label: <DiscordLogoIcon />, target: '_blank' },
];

export default function Profile() {

  const smallScreen = useSmallScreen(1e9, 450);

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      alignItems: 'stretch',
      justifyContent: 'stretch',
      ...(smallScreen ? {
        flexDirection: 'row',
      } : {
        flexDirection: 'column'
      })
    }}>
      <Header />
      <main style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        flexGrow: 1
      }}>
        <UserProfile
          appearance={{
            elements: {
              profileSectionPrimaryButton: {
                display: 'none'
              },
              userPreviewAvatarBox: {
                backgroundColor: '#000',
                backgroundImage: 'url("https://play.turingpoker.com/assets/logo.png")',
                backgroundPosition: 'center',
                backgroundSize: '80px',
                border: '1px solid #000'
              },
              avatarImage: {
                display: 'none'
              }
            }
          }}
        >
          <UserProfile.Page label='API Keys' url='api-keys' labelIcon={<GearIcon />}>
            <Keys />
          </UserProfile.Page>
          <Outlet />
        </UserProfile>
      </main>
    </div >
  )
}
