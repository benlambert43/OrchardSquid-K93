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
```

It asks for the iPad's root password, which is not kept in this repository.

The desktop app does not use the password. It connects through the USB cable and signs in with a key of its own, which is created and added to the iPad once:

```
ssh-keygen -t ed25519 -N "" -C "OrchardSquid-K93" -f ~/.ssh/orchardsquid-k93
ssh-copy-id -i ~/.ssh/orchardsquid-k93.pub Bens-iPad
```

Without the key, the Shell page asks for the password each time, the Dashboard fills only its iPad and Status panels, and the Software page stays empty.

On the Settings page, Export backup saves the key and these settings as a zip file, and Restore backup sets another computer up from that file instead of the password. By hand, the same restore is:

```
mkdir -p ~/.ssh && chmod 700 ~/.ssh
(umask 077 && unzip -p backup.zip key.json | jq -j .privateKey > ~/.ssh/orchardsquid-k93)
unzip -p backup.zip key.json | jq -j .publicKey > ~/.ssh/orchardsquid-k93.pub
unzip -p backup.zip known-hosts.json | jq -r '.entries[] | "\(.hosts) \(.type) \(.key)"' >> ~/.ssh/known_hosts
unzip -p backup.zip ssh-config.json | jq -r '.hosts[] | "Host \(.host)", (.options[] | "    \(.name) \(.value)"), ""' >> ~/.ssh/config
```

The zip file holds the private key, so keep it as safe as the key itself.
