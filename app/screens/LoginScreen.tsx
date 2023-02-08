import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useMemo, useRef, useState } from "react"
import { TextInput, TextStyle, ViewStyle } from "react-native"
import { Button, Icon, Screen, Text, TextField, TextFieldAccessoryProps } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { colors, spacing } from "../theme"
import NodeDetailManager from "@toruslabs/fetch-node-details";
import Torus from "@toruslabs/torus.js";
import { useNavigation} from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";

const useTorusGoogleSignIn = (): {
  privateKey: Uint8Array | undefined;
  email: string | undefined;
} => {
  const [privateKey, setPrivateKey] = useState<Uint8Array | undefined>();
  const [email, setEmail] = useState<string | undefined>();

  
  const naviagtion = useNavigation();

  useEffect(() => {
   

    (async () => {
      try {
        const nonce: string = Math.floor(Math.random() * 10000).toString();
        const state = encodeURIComponent(
          Buffer.from(
            JSON.stringify({
              instanceId: nonce,
              redirectToOpener: false,
            })
          ).toString("base64")
        );

        const finalUrl = new URL(
          "https://accounts.google.com/o/oauth2/v2/auth"
        );
        finalUrl.searchParams.append("response_type", "token id_token");
        finalUrl.searchParams.append(
          "client_id",
          "413984222848-8r7u4ip9i6htppalo6jopu5qbktto6mi.apps.googleusercontent.com"
        );
        finalUrl.searchParams.append("state", state);
        finalUrl.searchParams.append("scope", "profile email openid");
        finalUrl.searchParams.append("nonce", nonce);
        finalUrl.searchParams.append("prompt", "consent select_account");
        finalUrl.searchParams.append(
          "redirect_uri",
          "https://oauth.keplr.app/google.html"
        );

        const result = await WebBrowser.openAuthSessionAsync(
          finalUrl.href,
          "app.keplr.oauth://"
        );
        if (result.type !== "success") {
          throw new Error("Failed to get the oauth");
        }

        if (!result.url.startsWith("app.keplr.oauth://google#")) {
          throw new Error("Invalid redirection");
        }

        const redirectedUrl = new URL(result.url);
        const paramsString = redirectedUrl.hash;
        const searchParams = new URLSearchParams(
          paramsString.startsWith("#") ? paramsString.slice(1) : paramsString
        );
        if (state !== searchParams.get("state")) {
          throw new Error("State doesn't match");
        }
        const idToken = searchParams.get("id_token");
        const accessToken = searchParams.get("access_token");

        const userResponse = await fetch(
          "https://www.googleapis.com/userinfo/v2/me",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken || idToken}`,
            },
          }
        );

        if (userResponse.ok) {
          const userInfo: {
            picture: string;
            email: string;
            name: string;
          } = await userResponse.json();

          const { email } = userInfo;

          const nodeDetailManager = new NodeDetailManager({
            network: "mainnet",
            proxyAddress: "0x638646503746d5456209e33a2ff5e3226d698bea",
          });
          const {
            torusNodeEndpoints,
            torusNodePub,
            torusIndexes,
          } = await nodeDetailManager.getNodeDetails({
            verifier: "chainapsis-google",
            verifierId: email.toLowerCase(),
          });

          const torus = new Torus();

          const response = await torus.getPublicAddress(
            torusNodeEndpoints,
            torusNodePub,
            {
              verifier: "chainapsis-google",
              verifierId: email.toLowerCase(),
            },
            true
          );
          const data = await torus.retrieveShares(
            torusNodeEndpoints,
            torusIndexes,
            "chainapsis-google",
            {
              verifier_id: email.toLowerCase(),
            },
            (idToken || accessToken) as string
          );
          if (typeof response === "string")
            throw new Error("must use extended pub key");
          if (
            data.ethAddress.toLowerCase() !== response.address.toLowerCase()
          ) {
            throw new Error("data ethAddress does not match response address");
          }

          setPrivateKey(Buffer.from(data.privKey.toString(), "hex"));
          setEmail(email);
        } else {
          throw new Error("Failed to fetch user data");
        }
      } catch (e) {
        console.log(e);
        naviagtion.goBack();
      } finally {
   
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    privateKey,
    email,
  };
};



interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = observer(function LoginScreen(_props) {
  const authPasswordInput = useRef<TextInput>()
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [attemptsCount, setAttemptsCount] = useState(0)
  const {
    authenticationStore: {
      authEmail,
      authPassword,
      setAuthEmail,
      setAuthPassword,
      setAuthToken,
      validationErrors,
    },
  } = useStores()

  useEffect(() => {
    // Here is where you could fetch credentials from keychain or storage
    // and pre-fill the form fields.
    setAuthEmail("ignite@infinite.red")
    setAuthPassword("ign1teIsAwes0m3")
  }, [])

  const errors: typeof validationErrors = isSubmitted ? validationErrors : ({} as any)

  function login() {
    setIsSubmitted(true)
    setAttemptsCount(attemptsCount + 1)

    if (Object.values(validationErrors).some((v) => !!v)) return

    // Make a request to your server to get an authentication token.
    // If successful, reset the fields and set the token.
    setIsSubmitted(false)
    setAuthPassword("")
    setAuthEmail("")

    // We'll mock this with a fake token.
    setAuthToken(String(Date.now()))
  }

  const PasswordRightAccessory = useMemo(
    () =>
      function PasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <Icon
            icon={isAuthPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            onPress={() => setIsAuthPasswordHidden(!isAuthPasswordHidden)}
          />
        )
      },
    [isAuthPasswordHidden],
  )

  useEffect(() => {
    return () => {
      setAuthPassword("")
      setAuthEmail("")
    }
  }, [])

  return (
    <Screen
      preset="auto"
      contentContainerStyle={$screenContentContainer}
      safeAreaEdges={["top", "bottom"]}
    >
      <Text testID="login-heading" tx="loginScreen.signIn" preset="heading" style={$signIn} />
      <Text tx="loginScreen.enterDetails" preset="subheading" style={$enterDetails} />
      {attemptsCount > 2 && <Text tx="loginScreen.hint" size="sm" weight="light" style={$hint} />}

      <TextField
        value={authEmail}
        onChangeText={setAuthEmail}
        containerStyle={$textField}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        labelTx="loginScreen.emailFieldLabel"
        placeholderTx="loginScreen.emailFieldPlaceholder"
        helper={errors?.authEmail}
        status={errors?.authEmail ? "error" : undefined}
        onSubmitEditing={() => authPasswordInput.current?.focus()}
      />

      <TextField
        ref={authPasswordInput}
        value={authPassword}
        onChangeText={setAuthPassword}
        containerStyle={$textField}
        autoCapitalize="none"
        autoComplete="password"
        autoCorrect={false}
        secureTextEntry={isAuthPasswordHidden}
        labelTx="loginScreen.passwordFieldLabel"
        placeholderTx="loginScreen.passwordFieldPlaceholder"
        helper={errors?.authPassword}
        status={errors?.authPassword ? "error" : undefined}
        onSubmitEditing={login}
        RightAccessory={PasswordRightAccessory}
      />

      <Button
        testID="login-button"
        tx="loginScreen.tapToSignIn"
        style={$tapButton}
        preset="reversed"
        onPress={login}
      />
    </Screen>
  )
})

const $screenContentContainer: ViewStyle = {
  paddingVertical: spacing.huge,
  paddingHorizontal: spacing.large,
}

const $signIn: TextStyle = {
  marginBottom: spacing.small,
}

const $enterDetails: TextStyle = {
  marginBottom: spacing.large,
}

const $hint: TextStyle = {
  color: colors.tint,
  marginBottom: spacing.medium,
}

const $textField: ViewStyle = {
  marginBottom: spacing.large,
}

const $tapButton: ViewStyle = {
  marginTop: spacing.extraSmall,
}

// @demo remove-file
