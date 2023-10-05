import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SwitchNetworksModal } from 'src/app/features/home/SwitchNetworksModal'
import { AppRoutes } from 'src/app/navigation/constants'
import { useDappContext } from 'src/background/features/dapp/hooks'
import { Flex, Icons, Popover, Text, TouchableArea, Unicon } from 'ui/src'
import { iconSizes } from 'ui/src/theme'
import { useDisplayName } from 'wallet/src/features/wallet/hooks'

const POPUP_SHADOW_RADIUS = 4

type PortfolioHeaderProps = {
  address: Address
}

export function PortfolioHeader({ address }: PortfolioHeaderProps): JSX.Element {
  const navigate = useNavigate()

  const displayName = useDisplayName(address)?.name

  const onPressAccount = (): void => {
    navigate(AppRoutes.AccountSwitcher)
  }

  // Value does not matter, only used as a trigger to re-render the component when the dapp connection status changes
  const [updateConnectionStatus, setUpdateConnectionStatus] = useState(false)
  const { dappConnected } = useDappContext(undefined, updateConnectionStatus)

  return (
    <Flex row alignItems="center" justifyContent="space-between">
      <Flex
        centered
        row
        borderRadius="$rounded24"
        cursor="pointer"
        gap="$spacing8"
        onPress={onPressAccount}>
        <Unicon address={address} size={iconSizes.icon36} />
        <Flex row gap="$spacing4" py="$spacing16">
          <Text variant="subheading2">{displayName}</Text>
          <Icons.Chevron
            color="$neutral2"
            size={iconSizes.icon20}
            // TODO (MOB-1240): make Chevron component more reusable
            style={{ transform: [{ rotate: '270deg' }] }}
          />
        </Flex>
      </Flex>
      <Flex row alignItems="center" gap="$spacing16" justifyContent="space-around">
        {dappConnected ? (
          <Popover stayInFrame>
            <Popover.Trigger
              onTouchEnd={(): void => setUpdateConnectionStatus(!updateConnectionStatus)}>
              <Icons.Globe color="$neutral2" size="$icon.20" />
            </Popover.Trigger>
            <Popover.Content
              borderColor="$surface2"
              borderRadius="$rounded12"
              borderWidth={1}
              pl="$spacing4"
              shadowColor="$neutral3"
              shadowRadius={POPUP_SHADOW_RADIUS}>
              <SwitchNetworksModal />
            </Popover.Content>
          </Popover>
        ) : null}
        <TouchableArea onPress={(): void => navigate('/settings')}>
          <Icons.Settings color="$neutral2" size="$icon.24" />
        </TouchableArea>
      </Flex>
    </Flex>
  )
}
