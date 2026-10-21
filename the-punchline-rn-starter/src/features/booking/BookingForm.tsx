import React, { useMemo, useRef, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useFormik } from "formik";
import * as Yup from "yup";

import { submitBooking } from "../../api/bookings";
import { track } from "../../analytics/analytics";
import type { Show } from "../../data/shows";
import { PrimaryButton } from "../../components/PrimaryButton";
import { colors } from "../../theme/colors";
import { QuantityStepper } from "./QuantityStepper";

const MAX_TICKETS_PER_BOOKING = 6;

type BookingValues = { name: string; email: string; quantity: number };

function buildSchema(maxQuantity: number) {
  return Yup.object({
    name: Yup.string()
      .trim()
      .min(2, "Enter your full name")
      .required("Name is required"),
    email: Yup.string()
      .trim()
      .email("Enter a valid email")
      .required("Email is required"),
    quantity: Yup.number()
      .integer()
      .min(1, "Choose at least 1 ticket")
      .max(maxQuantity, `You can book up to ${maxQuantity} tickets`)
      .required(),
  });
}

type Props = {
  show: Show;
  onBooked: (quantity: number) => void;
  onDone: () => void;
};

export function BookingForm({ show, onBooked, onDone }: Props) {
  const maxQuantity = Math.min(MAX_TICKETS_PER_BOOKING, show.seatsLeft);
  const validationSchema = useMemo(
    () => buildSchema(maxQuantity),
    [maxQuantity],
  );
  const [confirmed, setConfirmed] = useState<BookingValues | null>(null);
  const hasStartedRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const emailRef = useRef<TextInput>(null);

  const formik = useFormik<BookingValues>({
    initialValues: { name: "", email: "", quantity: Math.min(2, maxQuantity) },
    validationSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(undefined);
      try {
        await submitBooking({
          showId: show.id,
          name: values.name.trim(),
          email: values.email.trim(),
          quantity: values.quantity,
        });
        track("booking_submitted", {
          show_id: show.id,
          quantity: values.quantity,
          seats_left: show.seatsLeft,
        });
        setConfirmed(values);
        onBooked(values.quantity);
      } catch {
        track("booking_failed", { show_id: show.id });
        helpers.setStatus(
          "We could not complete your booking. Please try again.",
        );
      }
    },
  });

  const onFieldFocus = () => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      track("booking_started", { show_id: show.id });
    }
  };

  const onPressBook = async () => {
    if (submitInFlightRef.current) {
      return;
    }
    submitInFlightRef.current = true;
    Keyboard.dismiss();
    try {
      const errors = await formik.validateForm();
      const invalidFields = Object.keys(errors).sort();
      if (invalidFields.length > 0) {
        track("booking_validation_failed", {
          show_id: show.id,
          invalid_fields: invalidFields,
        });
      }
      await formik.submitForm();
    } finally {
      submitInFlightRef.current = false;
    }
  };

  if (confirmed) {
    return (
      <View style={styles.confirmation} accessibilityRole="alert">
        <Text style={styles.confirmationTitle}>You're on the list.</Text>
        <Text style={styles.confirmationBody}>
          {confirmed.quantity} {confirmed.quantity === 1 ? "ticket" : "tickets"}{" "}
          for {show.headliner}. A confirmation is on its way to{" "}
          {confirmed.email.trim()}.
        </Text>
        <PrimaryButton
          label="Back to shows"
          onPress={onDone}
          style={styles.submit}
        />
      </View>
    );
  }

  if (maxQuantity < 1) {
    return <Text style={styles.soldOut}>This show is sold out.</Text>;
  }

  const fieldError = (field: keyof BookingValues) =>
    formik.touched[field] && formik.errors[field]
      ? String(formik.errors[field])
      : undefined;

  return (
    <View>
      <Field
        label="Full name"
        error={fieldError("name")}
        value={formik.values.name}
        onChangeText={formik.handleChange("name")}
        onBlur={formik.handleBlur("name")}
        onFocus={onFieldFocus}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <Field
        ref={emailRef}
        label="Email"
        error={fieldError("email")}
        value={formik.values.email}
        onChangeText={formik.handleChange("email")}
        onBlur={formik.handleBlur("email")}
        onFocus={onFieldFocus}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="done"
      />
      <QuantityStepper
        value={formik.values.quantity}
        min={1}
        max={maxQuantity}
        onChange={(value) => {
          onFieldFocus();
          formik.setFieldValue("quantity", value);
        }}
      />
      {formik.values.quantity >= maxQuantity ? (
        <Text style={styles.hint} accessibilityLiveRegion="polite">
          {show.seatsLeft > MAX_TICKETS_PER_BOOKING
            ? `Up to ${MAX_TICKETS_PER_BOOKING} tickets per booking.`
            : `Only ${show.seatsLeft} ${show.seatsLeft === 1 ? "seat" : "seats"} left for this show.`}
        </Text>
      ) : null}
      {fieldError("quantity") ? (
        <Text style={styles.error}>{fieldError("quantity")}</Text>
      ) : null}
      {formik.status ? (
        <Text style={styles.error} accessibilityRole="alert">
          {formik.status}
        </Text>
      ) : null}

      <PrimaryButton
        label="Book now"
        onPress={onPressBook}
        loading={formik.isSubmitting}
        style={styles.submit}
      />
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  ref?: React.Ref<TextInput>;
};

function Field({ label, error, ref, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <TextInput
        ref={ref}
        style={[styles.input, error ? styles.inputInvalid : null]}
        placeholder={label}
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        accessibilityHint={error}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputInvalid: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13, marginTop: 4, marginBottom: 4 },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  submit: { marginTop: 8 },
  soldOut: { color: colors.muted, fontSize: 16 },
  confirmation: { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  confirmationTitle: { color: colors.accent, fontSize: 20, fontWeight: "800" },
  confirmationBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
});
