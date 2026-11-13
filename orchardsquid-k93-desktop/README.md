Connecting to the iPad:

~/.ssh/config needs to allow a less secure HostKeyAlgorithm supported by the processor:

```
   Host Bens-iPad
   HostName 192.168.68.115
   User root
   HostKeyAlgorithms +ssh-rsa
```

You can then ssh into the iPad:

```
Connect:
ssh Bens-iPad

Password:
OrchardSquid-K93
```

The desktop app does not use the password. It connects through the USB cable and signs in with a key of its own, which is created and added to the iPad once:

```
ssh-keygen -t ed25519 -N "" -C "OrchardSquid-K93" -f ~/.ssh/orchardsquid-k93
ssh-copy-id -i ~/.ssh/orchardsquid-k93.pub Bens-iPad
```

Without the key, the Shell page asks for the password each time and the Dashboard's System panel stays empty.
