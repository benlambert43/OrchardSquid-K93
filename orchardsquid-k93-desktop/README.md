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
