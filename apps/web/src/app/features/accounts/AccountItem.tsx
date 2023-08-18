import { useToastController } from '@tamagui/toast'
import { GestureResponderEvent } from 'react-native'
import { ColorTokens, Flex, Text, Unicon, XStack, YStack } from 'ui/src'
import CheckIcon from 'ui/src/assets/icons/check.svg'
import CopyIcon from 'ui/src/assets/icons/copy-sheets.svg'
import { colorsDark, iconSizes } from 'ui/src/theme'
import { usePortfolioUSDBalance } from 'wallet/src/features/portfolio/hooks'
import { useDisplayName } from 'wallet/src/features/wallet/hooks'
import { sanitizeAddressText, shortenAddress } from 'wallet/src/utils/addresses'

type AccountItemProps = {
  accentColor: ColorTokens
  address: Address
  selected: boolean
  onAccountSelect?: () => void
}

export function AccountItem({
  address,
  accentColor,
  selected,
  onAccountSelect,
}: AccountItemProps): JSX.Element {
  const { portfolioBalanceUSD, loading, error } = usePortfolioUSDBalance(address)
  const { show: showToast } = useToastController()
  const displayName = useDisplayName(address)?.name

  const copyAddress = async (e: GestureResponderEvent): Promise<void> => {
    await navigator.clipboard.writeText(address)
    showToast('Copied to clipboard', {
      native: false,
      duration: 3000,
      viewportName: 'popup',
    })
    e.stopPropagation()
  }

  return (
    // TODO(EXT-248): Change to TouchableArea
    // https://linear.app/uniswap/issue/EXT-248/need-web-equivalent-of-touchablearea
    <XStack
      backgroundColor="$surface1"
      borderColor={selected ? accentColor : '$surface3'}
      borderRadius={16}
      borderWidth={1.5}
      cursor="pointer"
      gap="$spacing8"
      justifyContent="space-between"
      padding="$spacing12"
      shadowColor="$surface3"
      shadowRadius={10}
      onPress={onAccountSelect}>
      <YStack flexGrow={1} gap="$spacing8">
        <XStack>
          <Flex flex={1}>
            <Unicon address={address} size={iconSizes.icon36} />
          </Flex>
          {selected && (
            <CheckIcon color={accentColor} height={iconSizes.icon20} width={iconSizes.icon20} />
          )}
        </XStack>
        <Flex>
          <Text color="$neutral1" variant="bodyLarge">
            {displayName}
          </Text>
          <XStack>
            <XStack space alignItems="center" flex={1}>
              <Text color="$neutral2" variant="bodySmall">
                {sanitizeAddressText(shortenAddress(address))}
              </Text>
              <Flex onPress={copyAddress}>
                {/* TODO convert icon and remove dark mode color hardcoding */}
                <CopyIcon
                  color={colorsDark.neutral2}
                  height={iconSizes.icon12}
                  width={iconSizes.icon12}
                />
              </Flex>
            </XStack>
            <Text color="$neutral2" variant="bodySmall">
              ${loading || error ? '' : portfolioBalanceUSD?.toFixed(2)}
            </Text>
          </XStack>
        </Flex>
      </YStack>
    </XStack>
  )
}
