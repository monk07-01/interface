import React from 'react'
import { Text, TextProps } from 'src/components/Text'
import { Theme } from 'ui/src/theme/restyle'

type DecimalNumberProps = TextProps & {
  number?: number
  formattedNumber: string
  separator?: string
  variant: keyof Theme['textVariants']
  loading?: boolean
  decimalThreshold?: number // below this value (not including) decimal part would have wholePartColor too
}

// Utility component to display decimal numbers where the decimal part
// is dimmed
export function DecimalNumber({
  loading = false,
  number,
  formattedNumber,
  separator = '.',
  variant,
  decimalThreshold = 1,
  ...rest
}: DecimalNumberProps): JSX.Element {
  const [pre, post] = formattedNumber.split(separator)

  const decimalPartColor =
    number === undefined || number >= decimalThreshold ? 'neutral2' : 'neutral1'

  return (
    <Text loading={loading} loadingPlaceholderText="$000.00" variant={variant} {...rest}>
      {pre}
      {post && (
        <Text color={decimalPartColor} fontSize={rest.fontSize} variant={variant}>
          {separator}
          {post}
        </Text>
      )}
    </Text>
  )
}
