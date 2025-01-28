import { FeePoolSelectAction, LiquidityEventName } from '@uniswap/analytics-events'
// eslint-disable-next-line no-restricted-imports
import { ProtocolVersion } from '@uniswap/client-pools/dist/pools/v1/types_pb'
import { Currency, Percent } from '@uniswap/sdk-core'
import { LoaderButton } from 'components/Button/LoaderButton'
import { HookModal } from 'components/Liquidity/HookModal'
import { useAllFeeTierPoolData } from 'components/Liquidity/hooks'
import { getDefaultFeeTiersWithData, isDynamicFeeTier } from 'components/Liquidity/utils'
import { DoubleCurrencyLogo } from 'components/Logo/DoubleLogo'
import CurrencySearchModal from 'components/SearchModal/CurrencySearchModal'
import { MouseoverTooltip } from 'components/Tooltip'
import { PrefetchBalancesWrapper } from 'graphql/data/apollo/AdaptiveTokenBalancesProvider'
import { useCurrencyInfo } from 'hooks/Tokens'
import { SUPPORTED_V2POOL_CHAIN_IDS } from 'hooks/useNetworkSupportsV2'
import { AddHook } from 'pages/Pool/Positions/create/AddHook'
import { useCreatePositionContext } from 'pages/Pool/Positions/create/CreatePositionContext'
import { AdvancedButton, Container } from 'pages/Pool/Positions/create/shared'
import { FeeData } from 'pages/Pool/Positions/create/types'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMultichainContext } from 'state/multichain/useMultichainContext'
import { serializeSwapStateToURLParameters } from 'state/swap/hooks'
import { ClickableTamaguiStyle, TamaguiClickableStyle } from 'theme/components'
import { PositionField } from 'types/position'
import { DeprecatedButton, Flex, FlexProps, HeightAnimator, Text, TouchableArea, styled } from 'ui/src'
import { AlertTriangleFilled } from 'ui/src/components/icons/AlertTriangleFilled'
import { CheckCircleFilled } from 'ui/src/components/icons/CheckCircleFilled'
import { RotatableChevron } from 'ui/src/components/icons/RotatableChevron'
import { Search } from 'ui/src/components/icons/Search'
import { iconSizes } from 'ui/src/theme'
import { TokenLogo } from 'uniswap/src/components/CurrencyLogo/TokenLogo'
import { WRAPPED_NATIVE_CURRENCY, nativeOnChain } from 'uniswap/src/constants/tokens'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { areCurrenciesEqual } from 'uniswap/src/utils/currencyId'
import { NumberType } from 'utilities/src/format/types'
import { useTrace } from 'utilities/src/telemetry/trace/TraceContext'
import { useFormatter } from 'utils/formatNumbers'
import { isV4UnsupportedChain } from 'utils/networkSupportsV4'

export const CurrencySelector = ({ currency, onPress }: { currency?: Currency; onPress: () => void }) => {
  const { t } = useTranslation()
  // TODO: remove when backend returns token logos in graphql response: WEB-4920
  const currencyInfo = useCurrencyInfo(currency)

  return (
    <DeprecatedButton
      flex={1}
      width="100%"
      onPress={onPress}
      py="$spacing12"
      pr="$spacing12"
      pl="$spacing16"
      theme="primary"
      backgroundColor={currency ? '$surface3' : '$accent3'}
      justifyContent="space-between"
      gap="$spacing8"
      hoverStyle={{
        backgroundColor: undefined,
        opacity: 0.8,
      }}
      pressStyle={{
        backgroundColor: undefined,
      }}
    >
      <Flex row gap="$spacing8" alignItems="center">
        {currency && (
          <TokenLogo
            size={iconSizes.icon24}
            chainId={currency.chainId}
            name={currency.name}
            symbol={currency.symbol}
            url={currencyInfo?.logoUrl}
          />
        )}
        <Text variant="buttonLabel2" color={currency ? '$neutral1' : '$surface1'}>
          {currency ? currency.symbol : t('fiatOnRamp.button.chooseToken')}
        </Text>
      </Flex>
      <RotatableChevron direction="down" color="$neutral2" width={iconSizes.icon24} height={iconSizes.icon24} />
    </DeprecatedButton>
  )
}

interface FeeTier {
  value: FeeData
  title: string
  selectionPercent?: Percent
  tvl: string
}

const FeeTierContainer = styled(Flex, {
  flex: 1,
  width: '100%',
  p: '$spacing12',
  gap: '$spacing8',
  borderRadius: '$rounded12',
  borderWidth: 1,
  borderColor: '$surface3',
  position: 'relative',
  ...TamaguiClickableStyle,
})

const FeeTier = ({
  feeTier,
  selected,
  onSelect,
}: {
  feeTier: FeeTier
  selected: boolean
  onSelect: (value: FeeData) => void
}) => {
  const { t } = useTranslation()
  const { formatPercent } = useFormatter()
  const { formatNumberOrString } = useLocalizationContext()

  return (
    <FeeTierContainer
      onPress={() => onSelect(feeTier.value)}
      background={selected ? '$surface3' : '$surface1'}
      justifyContent="space-between"
    >
      <Flex gap="$spacing8">
        <Flex row gap={10} justifyContent="space-between">
          <Text variant="buttonLabel3">{formatPercent(new Percent(feeTier.value.feeAmount, 1000000))}</Text>
          {selected && <CheckCircleFilled size={iconSizes.icon16} />}
        </Flex>
        <Text variant="body4">{feeTier.title}</Text>
      </Flex>
      <Flex gap="$spacing2">
        <Text variant="body4" color="$neutral2">
          {feeTier.tvl === '0' ? '0' : formatNumberOrString({ value: feeTier.tvl, type: NumberType.FiatTokenStats })}{' '}
          {t('common.totalValueLocked')}
        </Text>
        {feeTier.selectionPercent && feeTier.selectionPercent.greaterThan(0) && (
          <Text variant="body4" color="$neutral2">
            {formatPercent(feeTier.selectionPercent)} select
          </Text>
        )}
      </Flex>
    </FeeTierContainer>
  )
}

export function SelectTokensStep({
  onContinue,
  tokensLocked,
  ...rest
}: { tokensLocked?: boolean; onContinue: () => void } & FlexProps) {
  const { formatPercent } = useFormatter()
  const { t } = useTranslation()
  const { setSelectedChainId } = useMultichainContext()
  const trace = useTrace()
  const [hookModalOpen, setHookModalOpen] = useState(false)
  const navigate = useNavigate()

  const {
    positionState: { hook, userApprovedHook, currencyInputs, fee, protocolVersion },
    setPositionState,
    derivedPositionInfo,
    setFeeTierSearchModalOpen,
  } = useCreatePositionContext()

  const [token0, token1] = derivedPositionInfo.currencies
  const [currencySearchInputState, setCurrencySearchInputState] = useState<PositionField | undefined>(undefined)
  const [isShowMoreFeeTiersEnabled, toggleShowMoreFeeTiersEnabled] = useReducer((state) => !state, false)
  const isV4UnsupportedTokenSelected =
    protocolVersion === ProtocolVersion.V4 &&
    (isV4UnsupportedChain(token0?.chainId) || isV4UnsupportedChain(token1?.chainId))
  const continueButtonEnabled =
    derivedPositionInfo.creatingPoolOrPair ||
    (derivedPositionInfo.protocolVersion === ProtocolVersion.V2 && derivedPositionInfo.pair) ||
    ((derivedPositionInfo.protocolVersion === ProtocolVersion.V3 ||
      derivedPositionInfo.protocolVersion === ProtocolVersion.V4) &&
      derivedPositionInfo.pool)

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      if (currencySearchInputState === undefined) {
        return
      }

      const otherInputState =
        currencySearchInputState === PositionField.TOKEN0 ? PositionField.TOKEN1 : PositionField.TOKEN0
      const otherCurrency = currencyInputs[otherInputState]
      const wrappedCurrencyNew = currency.isNative ? currency.wrapped : currency
      const wrappedCurrencyOther = otherCurrency?.isNative ? otherCurrency.wrapped : otherCurrency

      setSelectedChainId(currency.chainId)

      if (areCurrenciesEqual(currency, otherCurrency) || areCurrenciesEqual(wrappedCurrencyNew, wrappedCurrencyOther)) {
        setPositionState((prevState) => ({
          ...prevState,
          currencyInputs: {
            ...prevState.currencyInputs,
            [otherInputState]: undefined,
            [currencySearchInputState]: currency,
          },
        }))
        return
      }

      if (otherCurrency && otherCurrency?.chainId !== currency.chainId) {
        setPositionState((prevState) => ({
          ...prevState,
          currencyInputs: { [otherInputState]: undefined, [currencySearchInputState]: currency },
        }))
        return
      }

      switch (currencySearchInputState) {
        case PositionField.TOKEN0:
        case PositionField.TOKEN1:
          // If the tokens change, we want to reset the default fee tier in the useEffect below.
          setDefaultFeeTierSelected(false)
          setPositionState((prevState) => ({
            ...prevState,
            currencyInputs: { ...prevState.currencyInputs, [currencySearchInputState]: currency },
          }))
          break
        default:
          break
      }
    },
    [currencyInputs, currencySearchInputState, setPositionState, setSelectedChainId],
  )

  const handleFeeTierSelect = useCallback(
    (feeData: FeeData) => {
      setPositionState((prevState) => ({ ...prevState, fee: feeData }))
      sendAnalyticsEvent(LiquidityEventName.SELECT_LIQUIDITY_POOL_FEE_TIER, {
        action: FeePoolSelectAction.MANUAL,
        fee_tier: feeData.feeAmount,
        ...trace,
      })
    },
    [setPositionState, trace],
  )

  const { feeTierData, hasExistingFeeTiers } = useAllFeeTierPoolData({
    chainId: token0?.chainId,
    protocolVersion,
    currencies: derivedPositionInfo.currencies,
  })

  const feeTiers = getDefaultFeeTiersWithData({ chainId: token0?.chainId, feeTierData, t })
  const [defaultFeeTierSelected, setDefaultFeeTierSelected] = useState(false)
  const mostUsedFeeTier = useMemo(() => {
    if (hasExistingFeeTiers && feeTierData && Object.keys(feeTierData).length > 0) {
      return Object.values(feeTierData).reduce((highest, current) => {
        return current.percentage.greaterThan(highest.percentage) ? current : highest
      })
    }

    return undefined
  }, [hasExistingFeeTiers, feeTierData])

  useEffect(() => {
    if (mostUsedFeeTier && !defaultFeeTierSelected) {
      setDefaultFeeTierSelected(true)
      setPositionState((prevState) => ({
        ...prevState,
        fee: mostUsedFeeTier.fee,
      }))
      sendAnalyticsEvent(LiquidityEventName.SELECT_LIQUIDITY_POOL_FEE_TIER, {
        action: FeePoolSelectAction.RECOMMENDED,
        fee_tier: mostUsedFeeTier.fee.feeAmount,
        ...trace,
      })
    }
  }, [mostUsedFeeTier, defaultFeeTierSelected, setPositionState, trace])

  const { chains } = useEnabledChains()
  const supportedChains = useMemo(() => {
    return protocolVersion === ProtocolVersion.V4
      ? chains.filter((chain) => !isV4UnsupportedChain(chain))
      : protocolVersion === ProtocolVersion.V2
        ? chains.filter((chain) => SUPPORTED_V2POOL_CHAIN_IDS.includes(chain))
        : undefined
  }, [protocolVersion, chains])

  const handleOnContinue = () => {
    if (hook !== userApprovedHook) {
      setHookModalOpen(true)
    } else {
      onContinue()
    }
  }

  const wrappedNativeWarning = useMemo(():
    | { wrappedToken: Currency; nativeToken: Currency; swapUrlParams: string }
    | undefined => {
    if (protocolVersion !== ProtocolVersion.V4) {
      return undefined
    }

    const wethToken0 = token0 && WRAPPED_NATIVE_CURRENCY[token0?.chainId]
    if (token0 && wethToken0?.equals(token0)) {
      const nativeToken = nativeOnChain(token0.chainId)
      return {
        wrappedToken: token0,
        nativeToken,
        swapUrlParams: serializeSwapStateToURLParameters({
          chainId: token0.chainId,
          inputCurrency: token0,
          outputCurrency: nativeToken,
        }),
      }
    }

    const wethToken1 = token1 && WRAPPED_NATIVE_CURRENCY[token1?.chainId]
    if (token1 && wethToken1?.equals(token1)) {
      const nativeToken = nativeOnChain(token1.chainId)
      return {
        wrappedToken: token1,
        nativeToken,
        swapUrlParams: serializeSwapStateToURLParameters({
          chainId: token1.chainId,
          inputCurrency: token1,
          outputCurrency: nativeToken,
        }),
      }
    }

    return undefined
  }, [token0, token1, protocolVersion])

  return (
    <>
      {hook && (
        <HookModal
          isOpen={hookModalOpen}
          address={hook}
          onClose={() => setHookModalOpen(false)}
          onClearHook={() => setPositionState((state) => ({ ...state, hook: undefined }))}
          onContinue={() => {
            setPositionState((state) => ({ ...state, userApprovedHook: hook }))
            onContinue()
          }}
        />
      )}
      <PrefetchBalancesWrapper>
        <Container {...rest}>
          <Flex gap="$spacing16">
            <Flex gap="$spacing12">
              <Flex>
                <Text variant="subheading1">{tokensLocked ? t('pool.tokenPair') : t('pool.selectPair')}</Text>
                <Text variant="body3" color="$neutral2">
                  {tokensLocked ? t('position.migrate.liquidity') : t('position.provide.liquidity')}
                </Text>
              </Flex>
              {tokensLocked && token0 && token1 ? (
                <Flex row gap="$gap16" py="$spacing4" alignItems="center">
                  <DoubleCurrencyLogo currencies={[token0, token1]} size={44} />
                  <Flex grow>
                    <Text variant="heading3">
                      {token0.symbol} / {token1.symbol}
                    </Text>
                  </Flex>
                </Flex>
              ) : (
                <Flex row gap="$gap16" $md={{ flexDirection: 'column' }}>
                  <CurrencySelector
                    currency={token0}
                    onPress={() => setCurrencySearchInputState(PositionField.TOKEN0)}
                  />
                  <CurrencySelector
                    currency={token1}
                    onPress={() => setCurrencySearchInputState(PositionField.TOKEN1)}
                  />
                </Flex>
              )}
              {protocolVersion === ProtocolVersion.V4 &&
                (isV4UnsupportedTokenSelected ? (
                  <Flex row alignItems="center" gap="$spacing8" mt="$spacing12">
                    <AlertTriangleFilled size="$icon.24" color="$statusCritical" />
                    <Text variant="body3" color="$statusCritical">
                      {t('position.migrate.v4unsupportedChain')}
                    </Text>
                  </Flex>
                ) : wrappedNativeWarning ? (
                  <Flex row gap="$gap12" backgroundColor="$surface2" borderRadius="$rounded12" p="$padding12">
                    <Flex flexShrink={0}>
                      <AlertTriangleFilled size="$icon.20" color="$statusWarning" />
                    </Flex>
                    <Flex flex={1}>
                      <Text variant="body3" color="$statusWarning">
                        <Trans
                          i18nKey="position.wrapped.warning"
                          values={{ nativeToken: wrappedNativeWarning.nativeToken.symbol }}
                        />
                      </Text>
                      <Text variant="body3" color="$neutral2">
                        <Trans
                          i18nKey="position.wrapped.warning.info"
                          values={{
                            nativeToken: wrappedNativeWarning.nativeToken.symbol,
                            wrappedToken: wrappedNativeWarning.wrappedToken.symbol,
                          }}
                        />
                      </Text>
                      <TouchableArea
                        onPress={() => navigate(`/swap${wrappedNativeWarning.swapUrlParams}`)}
                        mt="$spacing2"
                        {...ClickableTamaguiStyle}
                      >
                        <Text variant="buttonLabel4">
                          <Trans
                            i18nKey="position.wrapped.unwrap"
                            values={{ wrappedToken: wrappedNativeWarning.wrappedToken.symbol }}
                          />
                        </Text>
                      </TouchableArea>
                    </Flex>
                  </Flex>
                ) : (
                  <AddHook />
                ))}
            </Flex>
          </Flex>
          <Flex gap="$spacing24">
            <Flex>
              <Text variant="subheading1">
                <Trans i18nKey="fee.tier" />
              </Text>
              <Text variant="body3" color="$neutral2">
                {protocolVersion === ProtocolVersion.V2 ? t('fee.tier.description.v2') : t('fee.tier.description')}
              </Text>
            </Flex>

            {protocolVersion !== ProtocolVersion.V2 && (
              <Flex
                gap="$spacing8"
                pointerEvents={isV4UnsupportedTokenSelected || wrappedNativeWarning ? 'none' : 'auto'}
                opacity={isV4UnsupportedTokenSelected || wrappedNativeWarning ? 0.5 : 1}
              >
                <Flex
                  row
                  py="$spacing12"
                  px="$spacing16"
                  gap="$spacing24"
                  justifyContent="space-between"
                  alignItems="center"
                  borderRadius="$rounded12"
                  borderWidth={1}
                  borderColor="$surface3"
                >
                  <Flex gap="$gap4">
                    <Flex row gap="$gap8" alignItems="center">
                      <Text variant="subheading2" color="$neutral1">
                        {isDynamicFeeTier(fee) ? (
                          <Trans i18nKey="fee.tier.dynamic" />
                        ) : (
                          <Trans
                            i18nKey="fee.tierExact"
                            values={{ fee: formatPercent(new Percent(fee.feeAmount, 1000000)) }}
                          />
                        )}
                      </Text>
                      {fee.feeAmount === mostUsedFeeTier?.fee.feeAmount ? (
                        <MouseoverTooltip text={t('fee.tier.recommended.description')}>
                          <Flex
                            justifyContent="center"
                            borderRadius="$rounded6"
                            backgroundColor="$surface3"
                            px={7}
                            py={2}
                            x
                            $md={{ display: 'none' }}
                          >
                            <Text variant="buttonLabel4">
                              <Trans i18nKey="fee.tier.highestTvl" />
                            </Text>
                          </Flex>
                        </MouseoverTooltip>
                      ) : feeTiers.find((tier) => tier.value.feeAmount === fee.feeAmount) ? null : (
                        <Flex justifyContent="center" borderRadius="$rounded6" backgroundColor="$surface3" px={7}>
                          <Text variant="buttonLabel4">
                            <Trans i18nKey="fee.tier.new" />
                          </Text>
                        </Flex>
                      )}
                    </Flex>
                    <Text variant="body3" color="$neutral2">
                      <Trans i18nKey="fee.tier.label" />
                    </Text>
                  </Flex>
                  <DeprecatedButton
                    disabled={!currencyInputs.TOKEN0 || !currencyInputs.TOKEN1}
                    size="small"
                    px="$spacing12"
                    my="auto"
                    gap="$gap4"
                    theme="secondary"
                    onPress={toggleShowMoreFeeTiersEnabled}
                  >
                    <Text variant="buttonLabel4" $md={{ display: 'none' }}>
                      {isShowMoreFeeTiersEnabled ? t('common.less') : t('common.more')}
                    </Text>
                    <RotatableChevron
                      direction={isShowMoreFeeTiersEnabled ? 'up' : 'down'}
                      color="$neutral2"
                      width={iconSizes.icon20}
                      height={iconSizes.icon20}
                    />
                  </DeprecatedButton>
                </Flex>
                <HeightAnimator open={isShowMoreFeeTiersEnabled}>
                  <Flex flexDirection="column" display="flex" gap="$gap12">
                    <Flex
                      display="flex"
                      $platform-web={{
                        display: 'grid',
                      }}
                      gridTemplateColumns="repeat(4, 1fr)"
                      $md={{
                        gridTemplateColumns: 'repeat(2, 1fr)',
                      }}
                      gap={10}
                    >
                      {feeTiers.map((feeTier) => (
                        <FeeTier
                          key={feeTier.value.feeAmount}
                          feeTier={feeTier}
                          selected={feeTier.value.feeAmount === fee.feeAmount}
                          onSelect={handleFeeTierSelect}
                        />
                      ))}
                    </Flex>
                    {protocolVersion === ProtocolVersion.V4 && (
                      <AdvancedButton
                        title={t('fee.tier.search')}
                        Icon={Search}
                        onPress={() => {
                          setFeeTierSearchModalOpen(true)
                        }}
                      />
                    )}
                  </Flex>
                </HeightAnimator>
              </Flex>
            )}
          </Flex>
          <LoaderButton
            buttonKey="SelectTokensStep-continue"
            flex={1}
            py="$spacing16"
            px="$spacing20"
            backgroundColor="$accent3"
            hoverStyle={{
              backgroundColor: undefined,
              opacity: 0.8,
            }}
            pressStyle={{
              backgroundColor: undefined,
            }}
            onPress={handleOnContinue}
            loading={Boolean(!continueButtonEnabled && token0 && token1)}
            loaderColor="$surface1"
            disabled={!continueButtonEnabled || isV4UnsupportedTokenSelected || Boolean(wrappedNativeWarning)}
          >
            <Text variant="buttonLabel1" color="$surface1">
              <Trans i18nKey="common.button.continue" />
            </Text>
          </LoaderButton>
        </Container>

        <CurrencySearchModal
          isOpen={currencySearchInputState !== undefined}
          onDismiss={() => setCurrencySearchInputState(undefined)}
          onCurrencySelect={handleCurrencySelect}
          chainIds={supportedChains}
        />
      </PrefetchBalancesWrapper>
    </>
  )
}
