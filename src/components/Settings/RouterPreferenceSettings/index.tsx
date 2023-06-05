import { Trans } from '@lingui/macro'
import { useWeb3React } from '@web3-react/core'
import Column from 'components/Column'
import UniswapXRouterLabel from 'components/RouterLabel/UniswapXRouterLabel'
import { RowBetween, RowFixed } from 'components/Row'
import Toggle from 'components/Toggle'
import { isUniswapXSupportedChain } from 'constants/chains'
import { useUniswapXEnabled } from 'featureFlags/flags/gouda'
import { RouterPreference } from 'state/routing/slice'
import { useRouterPreference } from 'state/user/hooks'
import { Divider, ThemedText } from 'theme'

export default function RouterPreferenceSettings() {
  const { chainId } = useWeb3React()
  const [routerPreference, setRouterPreference] = useRouterPreference()
  const uniswapXEnabled = useUniswapXEnabled() && chainId && isUniswapXSupportedChain(chainId)

  return (
    <>
      {uniswapXEnabled && (
        <>
          <RowBetween gap="sm">
            <RowFixed>
              <Column gap="xs">
                <ThemedText.BodySecondary>
                  <UniswapXRouterLabel>
                    <ThemedText.BodySecondary>
                      <Trans>Uniswap X</Trans>
                    </ThemedText.BodySecondary>
                  </UniswapXRouterLabel>
                </ThemedText.BodySecondary>
                <ThemedText.Caption color="textSecondary">
                  <Trans>When available, broadcasts off-chain orders for better prices and lower network fees.</Trans>
                </ThemedText.Caption>
              </Column>
            </RowFixed>
            <Toggle
              id="toggle-uniswap-x-button"
              isActive={routerPreference === RouterPreference.X}
              toggle={() =>
                setRouterPreference(routerPreference === RouterPreference.X ? RouterPreference.API : RouterPreference.X)
              }
            />
          </RowBetween>
          <Divider />
        </>
      )}
      <RowBetween gap="sm">
        <RowFixed>
          <Column gap="xs">
            <ThemedText.BodySecondary>
              <Trans>Local routing</Trans>
            </ThemedText.BodySecondary>
          </Column>
        </RowFixed>
        <Toggle
          id="toggle-local-routing-button"
          isActive={routerPreference === RouterPreference.CLIENT}
          toggle={() =>
            setRouterPreference(
              routerPreference === RouterPreference.CLIENT ? RouterPreference.API : RouterPreference.CLIENT
            )
          }
        />
      </RowBetween>
    </>
  )
}
